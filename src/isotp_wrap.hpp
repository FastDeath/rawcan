#pragma once
#include <linux/can.h>
#include <linux/can/isotp.h>
#include <nan.h>
#include <v8.h>

/* allow PDUs greater 4095 bytes according ISO 15765-2:2015 */
#define MAX_PDU_LENGTH 6000

namespace rawcan
{

typedef struct {
    size_t length;
    unsigned char data[MAX_PDU_LENGTH + 1];
} isotp_frame;

class ISOTPWrap : public Nan::ObjectWrap
{
public:
    static NAN_MODULE_INIT(Initialize);

private:
    ISOTPWrap();

    static NAN_METHOD(New);
    static NAN_METHOD(Bind);
    static NAN_METHOD(Send);
    static NAN_METHOD(Close);
    static NAN_METHOD(SetFilter);
    static NAN_METHOD(OnSent);
    static NAN_METHOD(OnMessage);
    static NAN_METHOD(OnError);
    static NAN_METHOD(UvRef);
    static NAN_METHOD(UvUnRef);

    static void uvPollCallback(uv_poll_t* pollHandle, int status,
                               int events);
    void pollCallback(int status, int events);
    int doPoll();
    int doSend();
    int doRecv();
    void doClose();
    void callErrorCallback(int err);

    static Nan::Persistent<v8::Function> s_constructor;

    Nan::Callback m_sentCallback;
    Nan::Callback m_messageCallback;
    Nan::Callback m_errorCallback;

    int m_socket;
	struct can_isotp_options m_opts;
    struct can_isotp_fc_options m_fcopts;
    uv_poll_t m_uvHandle;
    isotp_frame m_recvBuffer;
    isotp_frame m_sendBuffer;
    int m_pollEvents = 0;
    bool m_closed = false;
};

NODE_MODULE(isotp_wrap, ISOTPWrap::Initialize);
}
