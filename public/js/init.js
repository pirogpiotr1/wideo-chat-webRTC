(function ($) {
    $.fn.initChat = function (options) {


        var defaults = {

            user_info: {
                name: null,
                user_id: null,
                room_name: null
            },
            ajax: {
                startListening: null
            }

        };

        defaults = $.extend(defaults, options);
        const drone = new ScaleDrone('L0YEtshct5737BhN', {
            name: defaults.user_info.name
        });
        let room;
        let dataChannel;
        let pc;

        var vars = {
            configuration: {
                iceServers: [{
                    urls: 'stun:stun.l.google.com:19302'
                }]
            },

        }

        var functions = {
            waitForConnect: function (room_s = null) {

                drone.on('open', error => {
                    console.log('open');
                    if (error) {
                        return console.error(error);
                    }
                });

                if (!room_s) {
                    room_s = 'observable-' + defaults.user_info.room_name;
                }

                room = drone.subscribe(room_s);
                room.on('open', error => {
                    if (error) {
                        return console.error(error);
                    }
                    if( $('.card-body .GREEN').length ){
                        $('.card-body .GREEN').remove();
                    }

                    $('.card-body').prepend('<span class="GREEN">Connected to '+ room.name+' </span>')
                    console.log('Connected to ' + room.name);
                });

                room.on('member_join', function (member) {
                    // Member object
                    $('.messages-inner').show();
                    $('.start-listening-inner').hide();
                });
                room.on('member_left', function (member) {
                    $('.messages-inner').hide();
                    $('.start-listening-inner').show();
                });

                room.on('members', members => {

                    console.log('users number: ' + members.length);

                    const isOfferer = members.length === 2;
                    functions.startWebRTC(isOfferer);
                });
            },
            sendSignalingMessage: function (message) {
                drone.publish({
                    room: room.name,
                    message
                });
            },
            startWebRTC: function (isOfferer) {
                console.log('Starting WebRTC in as', isOfferer ? 'offerer' : 'waiter');
                pc = new RTCPeerConnection(vars.configuration);
                pc.onicecandidate = event => {
                    if (event.candidate) {

                        functions.sendSignalingMessage({'candidate': event.candidate});
                    }
                }

                if (isOfferer) {
                    // If user is offerer let them create a negotiation offer and set up the data channel
                    pc.onnegotiationneeded = () => {
                        pc.createOffer(functions.localDescCreated, error => console.error(error));
                    }

                    dataChannel = pc.createDataChannel('chat');
                    functions.setupDataChannel();

                } else {
                    // If user is not the offerer let wait for a data channel
                    pc.ondatachannel = event => {
                        dataChannel = event.channel;
                        functions.setupDataChannel();
                    }
                }

                pc.onaddstream = event => {
                    $('#user_video').srcObject = event.stream;
                };

                navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                }).then(stream => {
                    // Display your local video in #localVideo element
                    my_video.srcObject = stream;
                    // Add your stream to be sent to the conneting peer
                    pc.addStream(stream);
                }, error => console.error(error));


                functions.startListentingToSignals();

            },
            startListentingToSignals: function () {
                // Listen to signaling data from Scaledrone
                room.on('data', (message, client) => {
                    console.log('startListentingToSignals');

                    // Message was sent by us
                    if (client.id === drone.clientId) {
                        return;
                    }
                    if (message.sdp) {
                        // This is called after receiving an offer or answer from another peer
                        console.log('receiving an offer or answer');
                        pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
                            console.log(pc.remoteDescription.type);
                            // When receiving an offer lets answer it
                            if (pc.remoteDescription.type === 'offer') {
                                console.log('Answering offer');
                                pc.createAnswer(functions.localDescCreated, error => console.error(error));
                            }
                        }, error => console.log(error));
                    } else if (message.candidate) {
                        // Add the new ICE candidate to our connections remote description
                        pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                    }
                });
            },
            localDescCreated: function (desc) {
                pc.setLocalDescription(
                    desc,
                    () => functions.sendSignalingMessage({'sdp': pc.localDescription}),
                    error => console.error(error)
                );
            },
            setupDataChannel: function () {
                console.log('setupDataChannel');
                functions.checkDataChannelState();
                dataChannel.onopen = functions.checkDataChannelState();
                dataChannel.onclose = functions.checkDataChannelState();
                dataChannel.onmessage = event =>
                    functions.insertMessage(JSON.parse(event.data), false)


            },
            checkDataChannelState: function () {

                console.log('WebRTC channel state is:', dataChannel.readyState);
                if (dataChannel.readyState === 'open') {
                  console.log({content: 'WebRTC data channel is now open'});
                }
            },
            insertMessage: function (options, isFromMe) {

              //  let template = $('template_message[data-template="message"]');

             //   $('.message__bubble').text(options.content);

               let clone = $('template_message[data-template="message"]').clone();
               clone.removeClass('no-visible');
               clone.attr('data-template', '');
               clone.find('.message__bubble').text(options.content);
               clone.find('.message__name').text(options.name);


                if (isFromMe) {
                   clone.find('.message').addClass('message--mine');
               } else {
                   clone.find('.message').addClass('message--theirs');
               }




               $('.messages').append(clone);

                // Scroll to bottom
              //  messagesEl.scrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
            },
            sendMessageEvent: function () {
                $('.BTN.SEND').on('click', function () {

                    let input = $('input[type="text"]');
                    let value = input.val();
                    input.val('') ;

                    const data = {
                        name:defaults.user_info.name,
                        content: value
                    };
                    console.log(data);
                    functions.checkDataChannelState();
                    dataChannel.send(JSON.stringify(data));

                    functions.insertMessage(data, true);
                });
            },
            startListening: function () {
                $('#start-listening').on('click', function () {

                    $.ajax({
                        type: 'POST',
                        url: defaults.ajax.startListening,
                        dataType: "json",
                        data: {
                            'room_name': room.name
                        },
                        success: function (data) {

                            switch (data.success) {
                                case 'OK':

                                    $('.messages-inner').show();
                                    $('.start-listening-inner').hide();
                                    console.log('beforeConnect');
                                    functions.waitForConnect(data.room_name);
                                    break;
                                case 'FALSE':
                                        console.log('no room avilable');
                                        $('.card-body').prepend('<span class="RED"> No room is avilable !</span>');
                                        setTimeout(function(){
                                            $('.RED').remove();
                                        }, 3000);
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




