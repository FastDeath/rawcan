#include "isotp_wrap.hpp"
#include <uv.h>
#include <net/if.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/ioctl.h>
//#include <linux/can/raw.h>
#include <linux/can.h>
#include <linux/can/isotp.h>
#include <fcntl.h>
#include <errno.h>
#include <unistd.h>
#include <node.h>
#include <algorithm>
#include <cassert>
#include <cstdint>
#include <cstdlib>

using Nan::Callback;
using v8::Local;
using v8::Function;
using v8::FunctionTemplate;
using v8::Value;
using std::begin;
using std::copy_n;

namespace rawcan
{
Nan::Persistent<Function> ISOTPWrap::s_constructor;

NAN_MODULE_INIT(ISOTPWrap::Initialize)
{
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("ISOTPWrap").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    SetPrototypeMethod(tpl, "bind", Bind);
    SetPrototypeMethod(tpl, "send", Send);
    SetPrototypeMethod(tpl, "close", Close);
    SetPrototypeMethod(tpl, "onSent", OnSent);
    SetPrototypeMethod(tpl, "onMessage", OnMessage);
    SetPrototypeMethod(tpl, "onError", OnError);
    SetPrototypeMethod(tpl, "ref", UvRef);
    SetPrototypeMethod(tpl, "unref", UvUnRef);

    s_constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("ISOTPWrap").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
}

ISOTPWrap::ISOTPWrap()
    : m_socket(socket(PF_CAN, SOCK_DGRAM, CAN_ISOTP))
{
    assert(m_socket);
    if (m_socket < 0) {
        perror("socket error");
    }

    // set socket options
	setsockopt(m_socket, SOL_CAN_ISOTP, CAN_ISOTP_OPTS, &m_opts, sizeof(m_opts));
    setsockopt(m_socket, SOL_CAN_ISOTP, CAN_ISOTP_RECV_FC, &m_fcopts, sizeof(m_fcopts));

    // set nonblocking mode
    int flags = fcntl(m_socket, F_GETFL, 0);
    fcntl(m_socket, F_SETFL, flags | O_NONBLOCK);

    uv_poll_init_socket(uv_default_loop(), &m_uvHandle, m_socket);
    m_uvHandle.data = this;
}

NAN_METHOD(ISOTPWrap::New)
{
    assert(info.IsConstructCall());
    auto* can = new ISOTPWrap();
    can->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(ISOTPWrap::Bind)
{
    assert(3 == info.Length());
    ISOTPWrap* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());

    assert(self);
    assert(!self->m_closed);

    Nan::Utf8String iface(info[0]->ToString());

    assert(info[1]->IsNumber());
    auto tx_id = (unsigned long int)info[1]->NumberValue();
    assert(tx_id <= 0x7FFU);
    
    assert(info[2]->IsNumber());
    auto rx_id = (unsigned long int)info[2]->NumberValue();
    assert(rx_id <= 0x7FFU);

    auto ifr = ifreq();
    strcpy(ifr.ifr_name, *iface);
    auto err = ioctl(self->m_socket, SIOCGIFINDEX, &ifr);

    if (err == 0)
    {
        auto canAddr = sockaddr_can();
        canAddr.can_family = AF_CAN;
        canAddr.can_ifindex = ifr.ifr_ifindex;
        canAddr.can_addr.tp.tx_id = tx_id;
        canAddr.can_addr.tp.rx_id = rx_id;

        err = bind(self->m_socket, reinterpret_cast<struct sockaddr*>(&canAddr),
                   sizeof(canAddr));
    }

    self->Ref();

    self->m_pollEvents |= UV_READABLE;
    self->doPoll();

    info.GetReturnValue().Set(err);
}

NAN_METHOD(ISOTPWrap::Send)
{
    assert(1 == info.Length());
    assert(node::Buffer::HasInstance(info[0]));

    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);
    assert(!self->m_closed);

    auto& sendBuffer = self->m_sendBuffer;

    auto length = node::Buffer::Length(info[0]);
    sendBuffer.length = length;
    copy_n(node::Buffer::Data(info[0]), length, begin(sendBuffer.data));

    self->m_pollEvents |= UV_WRITABLE;
    self->doPoll();
}

NAN_METHOD(ISOTPWrap::Close)
{
    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);

    self->doClose();
}

NAN_METHOD(ISOTPWrap::OnSent)
{
    // onSent(callback)
    assert(1 == info.Length());
    assert(info[0]->IsFunction());

    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);

    self->m_sentCallback.SetFunction(info[0].As<v8::Function>());
}

NAN_METHOD(ISOTPWrap::OnMessage)
{
    // onMessage(callback)
    assert(1 == info.Length());
    assert(info[0]->IsFunction());

    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);

    self->m_messageCallback.SetFunction(info[0].As<v8::Function>());
}

NAN_METHOD(ISOTPWrap::OnError)
{
    // onMessage(callback)
    assert(1 == info.Length());
    assert(info[0]->IsFunction());

    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);

    self->m_errorCallback.SetFunction(info[0].As<v8::Function>());
}

NAN_METHOD(ISOTPWrap::UvRef)
{
    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);

    uv_ref(reinterpret_cast<uv_handle_t*>(&self->m_uvHandle));
}

NAN_METHOD(ISOTPWrap::UvUnRef)
{
    auto* self = ObjectWrap::Unwrap<ISOTPWrap>(info.Holder());
    assert(self);

    uv_unref(reinterpret_cast<uv_handle_t*>(&self->m_uvHandle));
}

void ISOTPWrap::uvPollCallback(uv_poll_t* pollHandle, int status,
                             int events)
{
    auto* self = static_cast<ISOTPWrap*>(pollHandle->data);
    assert(self);
    self->pollCallback(status, events);
}

void ISOTPWrap::pollCallback(int status, int events)
{
    if (status == 0)
    {
        if (events & UV_WRITABLE)
        {
            const int err = doSend() < 0 ? errno : 0;

            // write would block, so wait for writable
            if (err == EWOULDBLOCK) {
                // m_pollEvents |= UV_WRITABLE;
                // doPoll();
                // printf("send returned EWOULDBLOCK/EAGAIN\n");
                return;
            }

            m_pollEvents &= ~UV_WRITABLE;
            doPoll();
            if (!m_sentCallback.IsEmpty())
            {
                Nan::HandleScope scope;
                Local<Value> argv[1] = {Nan::New(err)};
                m_sentCallback.Call(1, argv);
            }
            else
            {
                callErrorCallback(err);
            }
        }
        else if (events & UV_READABLE)
        {
            const int err = doRecv();
            if (err < 0)
            {
                callErrorCallback(errno);
            }
            else if (!m_messageCallback.IsEmpty())
            {
                Nan::HandleScope scope;
                Local<Value> argv[1] = {
                    Nan::CopyBuffer(reinterpret_cast<char*>(&m_recvBuffer.data),
                                    m_recvBuffer.length)
                        .ToLocalChecked()};
                m_messageCallback.Call(1, argv);
            }
        }
    }
    else
    {
        callErrorCallback(status);
    }
}

int ISOTPWrap::doPoll()
{
    if (m_closed)
    {
        return -1;
    }

    if (m_pollEvents)
    {
        return uv_poll_start(&m_uvHandle, m_pollEvents, uvPollCallback);
    }
    else
    {
        return uv_poll_stop(&m_uvHandle);
    }
}

int ISOTPWrap::doSend()
{
    return ::send(m_socket, &m_sendBuffer.data, m_sendBuffer.length, MSG_DONTWAIT);
}

int ISOTPWrap::doRecv()
{
    return m_recvBuffer.length = ::recv(m_socket, &m_recvBuffer.data, MAX_PDU_LENGTH + 1, 0);
}

void ISOTPWrap::doClose()
{
    if (!m_closed)
    {
        uv_poll_stop(&m_uvHandle);
        uv_close(reinterpret_cast<uv_handle_t*>(&m_uvHandle),
                 [](uv_handle_t* handle) {
                     auto* self = reinterpret_cast<ISOTPWrap*>(handle->data);
                     assert(!self->persistent().IsEmpty());
                     self->Unref();
                 });
       m_closed = true;
    }
}

void ISOTPWrap::callErrorCallback(int err)
{
    if (!m_errorCallback.IsEmpty())
    {
        Nan::HandleScope scope;
        Local<Value> argv[1] = {Nan::New(err)};
        m_errorCallback.Call(1, argv);
    }
}
}
