(function ($) {
    $.fn.initChat = function (options) {


        var defaults = {

            user_info: {
                name: null,
                user_id: null,
                room_name:null
            },
            ajax:{
                startListening: null
            }

        };

        defaults = $.extend(defaults, options);
        const drone =  new ScaleDrone('L0YEtshct5737BhN');
        let room;

        var vars = {
            configuration: {
                iceServers: [{
                    urls: 'stun:stun.l.google.com:19302'
                }]
            },
            roomName: defaults.user_info.name + '#'+defaults.user_info.user_id,
            pc: null,
            dataChanel: null

        }

        var functions = {
            waitForConnect: function ( room_s = null) {
                // jeśli nie łaczysz do tworz room ;
                console.log('waitForConnect');

                drone.on('open', error => {
                    console.log('open');
                    if (error) {
                        return console.error(error);
                    }
                });

                if(!room_s) {
                    room_s = 'observable-' +  defaults.user_info.room_name;

                }

                    room = drone.subscribe(room_s);
                    room.on('open', error => {
                        if (error) {
                            return console.error(error);
                        }
                        console.log('Connected');
                    });

                     room.on('member_join', function(member) {
                        // Member object

                        console.log('member');
                    });

                     room.on('members', members => {
                        console.log(members);
                        if (members.length >= 2) {
                            return alert('The room is full');
                        }

                        // If we are the second user to connect to the room we will be creating the offer
                        const isOfferer = members.length === 2;
                        functions.startWebRTC(isOfferer);
                });
            },
            sendSignalingMessage: function () {
               drone.publish({
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
                        vars.pc.createOffer( functions.localDescCreated(), error => console.error(error));
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
                room.on('data', (message, client) => {
                    // Message was sent by us
                    if (client.id === drone.clientId) {
                        return;
                    }
                    if (message.sdp) {
                        // This is called after receiving an offer or answer from another peer
                        vars.pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
                            console.log('pc.remoteDescription.type', vars.pc.remoteDescription.type);
                            // When receiving an offer lets answer it
                            if (vars.pc.remoteDescription.type === 'offer') {
                                console.log('Answering offer');
                                vars.pc.createAnswer(functions.localDescCreated, error => console.error(error));
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
                    () => functions.sendSignalingMessage({'sdp': vars.pc.localDescription}),
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
            },
            startListening: function(){
              $('#start-listening').on('click', function () {

                  $.ajax({
                      type:'POST',
                      url:defaults.ajax.startListening,
                      dataType: "json",
                      data: {
                          'room_name': room.name
                      },
                      success:function(data){

                          switch (data.success) {
                              case 'OK':

                                  $('.messages-inner').show();
                                  console.log('beforeConnect');
                                  functions.waitForConnect(data.room_name);
                              break;
                              case 'FALSE':
                                  console.error('empty from api');
                              break;
                              default:
                                  alert('no rooms found');
                          }

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




