(function ($) {
    $.fn.initChat = function (options) {

    console.log(1);
        var defaults = {

            user_info: {
                name: null,
                user_id: null
            },
            ajax:{
                startListening: null
            }

        };

        defaults = $.extend(defaults, options);

        var vars = {
            configuration: {
                iceServers: [{
                    url: 'stun:stun.l.google.com:19302'
                }]
            },
            drone: new ScaleDrone('L0YEtshct5737BhN'),
            room: null,
            roomName: defaults.user_info.name + '#'+defaults.user_info.user_id,
            pc: null,
            dataChanel: null

        }

        var functions = {
            waitForConnect: function (room) {
                vars.drone.on('open', error => {
                    if (error) {
                        return console.error(error);
                    }

                    vars.room = vars.drone.subscribe(vars.roomName);
                    vars.room.on('open', error => {
                        if (error) {
                            return console.error(error);
                        }
                        console.log('Connected to signaling server');
                    });

                    vars.room.on('members', members => {
                        if (members.length >= 2) {
                            return alert('The room is full');
                        }
                        console.log(members);
                        // If we are the second user to connect to the room we will be creating the offer
                        const isOfferer = members.length === 2;
                        functions.startWebRTC(isOfferer);
                    });
                });
            },
            sendSignalingMessage: function () {
                vars.drone.publish({
                    room: vars.roomName,
                    message
                });
            },
            startWebRTC: function(isOfferer){
                console.log('Starting WebRTC in as', isOfferer ? 'offerer' : 'waiter');
                vars.pc = new RTCPeerConnection(vars.configuration);
                vars.pc.onicecandidate = event => {
                    if (event.candidate) {
                        functions.sendSignalingMessage({'candidate': event.candidate});
                    }
                }

                if (isOfferer) {
                    // If user is offerer let them create a negotiation offer and set up the data channel
                    vars.pc.onnegotiationneeded = () => {
                        vars.pc.createOffer(localDescCreated, error => console.error(error));
                    }
                    vars.dataChannel = vars.pc.createDataChannel('chat');
                    functions.setupDataChannel();
                } else {
                    // If user is not the offerer let wait for a data channel
                    vars.pc.ondatachannel = event => {
                        vars.dataChannel = event.channel;
                        functions.setupDataChannel();
                    }
                }

                functions.startListentingToSignals();

            },
            startListentingToSignals:function(){
                // Listen to signaling data from Scaledrone
                vars.room.on('data', (message, client) => {
                    // Message was sent by us
                    if (client.id === vars.drone.clientId) {
                        return;
                    }
                    if (message.sdp) {
                        // This is called after receiving an offer or answer from another peer
                        vars.pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
                            console.log('pc.remoteDescription.type', vars.pc.remoteDescription.type);
                            // When receiving an offer lets answer it
                            if (vars.pc.remoteDescription.type === 'offer') {
                                console.log('Answering offer');
                                vars.pc.createAnswer(localDescCreated, error => console.error(error));
                            }
                        }, error => console.error(error));
                    } else if (message.candidate) {
                        // Add the new ICE candidate to our connections remote description
                        vars.pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                    }
                });
            },
            localDescCreated:function(desc) {
                vars.pc.setLocalDescription(
                    desc,
                    () => functions.sendSignalingMessage({'sdp': pc.localDescription}),
                    error => console.error(error)
                );
            },
            setupDataChannel:function(){
                functions.checkDataChannelState();
                vars.dataChannel.onopen =  functions.checkDataChannelState;
                vars.dataChannel.onclose =  functions.checkDataChannelState;
                vars.dataChannel.onmessage = event =>
                    functions.insertMessageToDOM(JSON.parse(event.data), false)
            },
            checkDataChannelState:function(){
                console.log('WebRTC channel state is:', vars.dataChannel.readyState);
                if (vars.dataChannel.readyState === 'open') {
                    functions.insertMessageToDOM({content: 'WebRTC data channel is now open'});
                }
            },
            insertMessageToDOM:function(options, isFromMe){
                let template = $('template_message[data-template="message"]');

                let nameEl = $('.message__name');

                $('.message__bubble').text(options.content);
                let clone = $('template_message[data-template="message"]').clone();
                let messageEl = clone.find('message');
                if (isFromMe) {
                    messageEl.addClass('message--mine');
                } else {
                    messageEl.addClass('message--theirs');
                }

                let messagesEl = $('.messages');
                messagesEl.append(clone);

                // Scroll to bottom
                messagesEl.scrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
            },
            sendMessageEvent: function(){
                $('.BTN.SEND').on('click' , function(){

                    let input = document.querySelector('input[type="text"]');
                    let value = input.value;
                    input.value = '';

                    const data = {
                        name,
                        content: value

                    };

                    vars.dataChannel.send(JSON.stringify(data));

                    functions.insertMessageToDOM(data, true);
                });

                functions.insertMessageToDOM({content: 'chat URL is ' + location.href });
            },
            startListening: function(){
              $('#start-listening').on('click', function () {

                  $.ajax({
                      type:'POST',
                      url:defaults.ajax.startListening,
                      data: {
                          'room_name': vars.roomName
                      },
                      success:function(data){
                          console.log(data.success);
                      }

                  });
              });
            },
            init: function () {
                functions.waitForConnect();
                functions.sendMessageEvent();
                functions.startListening();
            }
        };

        //elementy pobrane
        var $this = this;


        functions.init();

    }
})(jQuery);




