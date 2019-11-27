(function ($) {
    $.fn.initChat = function (options) {

        const TEMP_ROOM_NAME = 'observable-temp';
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
        var drone = null;

            defaults = $.extend(defaults, options);

        let room;
        let dataChannel;
        let pc;

        var vars = {
            configuration: {
                iceServers: [{
                    urls: 'stun:stun.l.google.com:19302'
                }]
            },
            members: null

        };

        var functions = {
            waitForConnect: function (room_s = null) {
                console.log('waitForConnect exe');
                drone.on('open', error => {
                    console.log('drone open');
                    if (error) {
                        return console.error(error);
                    }
                });




              //  schowaj połączenia, zawadzają wyświetl wiadomosc, przeniesc informacje o polaczonym pokoju


                room = drone.subscribe(room_s);

                room.on('open', error => {
                    console.log('room open');
                    if (error) {
                        return console.error(error);
                    }
                    if ($('.card-body .GREEN.conn-info').length) {
                        $('.card-body .conn-info').remove();
                    }
                    if ( $('.card-body .leave-room').length ) {
                        $('.card-body .leave-room').remove();
                    }

                    if (room.name !== TEMP_ROOM_NAME) {
                        $('.messages-inner').show();
                        $('.room-members').html('<span class="GREEN conn-info">Connected to ' + room.name + ' </span>')
                        $('.card-body').prepend('<button class="leave-room">Leave Room</button>');
                        $('.leave-room').on('click', function () {
                            functions.leaveCurrentRoom();
                        });
                    }

                });

                room.on('member_join', function ({id,clientData}) {
                    console.log('member_join');
                    if (!clientData){
                        console.log('user data is empty !!!!')
                    }
                    if  (room.name !== TEMP_ROOM_NAME) {
                        $('.messages-inner').show();

                    }else{
                        vars.members.push({id,clientData});
                        functions.updateRoomMembers();
                    }
                });

                room.on('member_leave', function ({id, clientData}) {
                    console.log('member_leave ' + id);
                    if(id === drone.clientId){
                        functions.waitForConnect(TEMP_ROOM_NAME);
                    }

                    if (room.name !== TEMP_ROOM_NAME) {
                        // jesli ktos opuscil room to sie stad wynoismy rowniez
                        $('.messages-inner').fadeOut();
                        $('.leave-room').fadeOut();
                        $("template_message:not('.no-visible')").remove();
                        functions.leaveCurrentRoom();

                        alert('User left the chat');

                    }else{
                        const index = vars.members.findIndex(member => member.id === id);
                      if(index >= 0)
                        vars.members.splice(index, 1);

                        functions.updateRoomMembers();
                    }
                });

                room.on('members', members => {
                    console.log('members');
                    console.log(members);
                    if (room.name !== TEMP_ROOM_NAME) {
                        const isOfferer = members.length >= 2;
                        functions.startWebRTC(isOfferer);
                    } else {

                        vars.members = members;
                        functions.updateRoomMembers();
                        functions.tempRoomData();
                    }

                });
                drone.on('close', event => {
                    // console.log()
                    console.log('drone closed:');
                    // functions.waitForConnect('observable-temp');
                });

                drone.on('disconnect', () => {
                    console.log('drone has disconnected');
                    //   functions.waitForConnect('observable-temp');
                });

                drone.on('reconnect', () => {
                    console.log('drone has reconnected');
                    //    functions.waitForConnect('observable-temp');
                });
                drone.on('error', error => {
                    console.log(error);
                    //   functions.waitForConnect('observable-temp');
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
                };
                if (isOfferer) {
                    // If user is offerer let them create a negotiation offer and set up the data channel
                    pc.onnegotiationneeded = () => {
                        pc.createOffer(functions.localDescCreated, error => console.error(error));
                    };

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
                    $('#user_video')[0].srcObject = event.stream;
                };

                navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                }).then(stream => {
                    // Display your local video in #localVideo element
                    $('#my_video')[0].srcObject = stream;
                    // Add your stream to be sent to the conneting peer
                    pc.addStream(stream);
                }, error => console.log(error));
                //
                pc.onaddstream = event => {
                    $('#user_video')[0].srcObject = event.stream;
                };

                navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true,
                }).then(stream => {
                    // Display your local video in #localVideo element
                    $('#my_video')[0].srcObject = stream;
                    // Add your stream to be sent to the conneting peer
                    pc.addStream(stream);
                }, error => console.log(error));

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
                if (!options.content) return;
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
                $(".messages").scrollTop($(".messages")[0].scrollHeight);

                // Scroll to bottom
                //  messagesEl.scrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
            },
            sendMessageEvent: function () {
                $('.BTN.SEND').on('click', function () {

                    let input = $('input[type="text"]');
                    let value = input.val();
                    input.val('');

                    const data = {
                        name: defaults.user_info.name,
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
                    //   functions.waitForConnect(); // tworze se pokoj
                    $('.bt-spinner-inner').css('display', 'flex');
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
                                    $('.bt-spinner-inner').hide();
                                    $('.messages-inner').show();
                                    $('.start-listening-inner').hide();
                                    console.log('beforeConnect');
                                    functions.waitForConnect(data.room_name);
                                    break;
                                case 'FALSE':
                                    $.ajax(this);
                                    break;
                                default:
                                    alert('no rooms found');
                            }
                        }
                    });


                });
            },
            leaveCurrentRoom: function () {
                console.log('leaveCurrentRoom');
                let name = room.name;
                room.unsubscribe();
                // drone.unsubscribe(room.name);
                $('.conn-info').remove();
                $('.leave-room').remove();
                $('.messages-inner').fadeOut();
                $('.leave-room').fadeOut();
              //  $('.start-listening-inner').fadeIn();
                $("template_message:not('.no-visible')").remove();
                //wracamy do pokoju temporary
                if( name !== TEMP_ROOM_NAME) {

                    functions.waitForConnect(TEMP_ROOM_NAME);
                }
            },
            updateRoomMembers: function () {
                console.log('updateRoomMembers');

                if(room.name === TEMP_ROOM_NAME) {

                    $('.room-members').html('');

                    $.each(vars.members, function (key, value) {

                          /*  if(!value["clientData"]){
                                initScaleDrone();
                                functions.init();
                                return;
                             /!*   //brak danych -> zwroc sie o dane
                                let data = {
                                    id: value["id"],
                                    type:'ASK_INFO_REQUEST',
                                    sender_id: drone.clientId
                                };

                                functions.sendSignalingMessage(data);*!/
                            }*/

                        if (value['clientData'] && value["id"] !== drone.clientId)
                            $('.room-members').append('<div class="member-event" data-id="' + value["id"] + '">' + value["clientData"]["name"] + '</div>');

                        $('.member-event').on('click', function () {

                            let data = {
                                id: $(this).attr('data-id'),
                                type: 'ASK',
                                sender_id: drone.clientId
                            };
                            functions.sendSignalingMessage(data);

                        });
                    });
                }
            },

            /**
             * only socket
             */
            tempRoomData:function(){
                room.on('data', ({id,type,sender_id,name,id_data}) => {



                switch(type){
                    case 'ASK':
                        if(id === drone.clientId){
                            let index_c = vars.members.findIndex(member => member.id === sender_id );
                            let  ask = window.confirm( vars.members[index_c]['clientData']['name'] + ' wants to contact, do You agree?');
                            if ( ask ) {
                                let data = {
                                    id:vars.members[index_c]['id'],
                                    type:'CONFIRM',
                                    sender_id: drone.clientId
                                };

                                functions.sendSignalingMessage(data);
                                functions.leaveCurrentRoom();
                                functions.waitForConnect('observable-'+ sender_id + id );
                            }else{
                                let data = {
                                    id:vars.members[index_c]['id'],
                                    type:'DENIED',
                                    sender_id: drone.clientId
                                };
                                functions.sendSignalingMessage(data);
                            }
                        }
                        break;
                    case 'CONFIRM':
                        if(id === drone.clientId) {


                            functions.leaveCurrentRoom();
                            functions.waitForConnect('observable-'+ id + sender_id );
                            alert('user accepted');
                        }

                        break;
                    case 'ASK_INFO_REQUEST':
                        if(id === drone.clientId){

                            let index_c = vars.members.findIndex(member => member.id === sender_id );
                           functions.sendClientData(defaults.user_info.name, defaults.user_id,index_c)
                        }

                        break;
                        case 'CONFIRM_INFO_REQUEST':
                        if(id === drone.clientId){
                            console.log(name);
                            console.log(id_data);

                        }

                        break;
                    default:
                        break;


                }
                });
            },
            sendClientData:function(name, id,index_c){
                let data = {
                    id:vars.members[index_c]['id'],
                    type:'CONFIRM_INFO_REQUEST',
                    sender_id: drone.clientId,
                    name:name,
                    id_data: id
                };

                functions.sendSignalingMessage(data);
            },
            init: function () {
                drone = new ScaleDrone("L0YEtshct5737BhN", {
                    data: {
                        name: defaults.user_info.name,
                        id: defaults.user_id
                    }
                });

                functions.waitForConnect(TEMP_ROOM_NAME);
                functions.sendMessageEvent();
               // functions.startListening();
                //let refresh_members = window.setInterval(functions.updateRoomMembers(), 500);
            }
        };

        //elementy pobrane
        var $this = this;


        functions.init();

    }
})(jQuery);




