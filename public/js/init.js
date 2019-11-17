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
            data: {
                name: defaults.user_info.name,
                id: defaults.user_id
            }

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
            members: null

        }

        var functions = {
            waitForConnect: function (room_s = null) {

                drone.on('open', error => {
                    console.log('open');
                    if (error) {
                        return console.error(error);
                    }
                });

                drone.on('close', event => {
                    console.log('closed by s1');

                });

                drone.on('disconnect', () => {
                    console.log('User has disconnected');
                });

                drone.on('error', error => {
                    console.log(error);
                });

                if (room_s != 'observable-temp') {
                    room_s = 'observable-' + defaults.user_info.room_name;
                }

                room = drone.subscribe(room_s);
                console.log(room.name)
                room.on('open', error => {
                    if (error) {
                        return console.error(error);
                    }
                    if ($('.card-body .GREEN.conn-info').length) {
                        $('.card-body .conn-info').remove();
                    }
                    if ($('.card-body .leave-room').length) {
                        $('.card-body .leave-room').remove();
                    }

                    if (room_s != 'observable-temp') {
                        $('.card-body').prepend('<span class="GREEN conn-info">Connected to ' + room.name + ' </span>')
                        $('.card-body').prepend('<button class="leave-room">Leave Room</button>')
                        $('.leave-room').on('click', function () {
                            functions.leaveCurrentRoom();
                        });
                    }

                    console.log('Connected to ' + room.name);
                });

                room.on('member_join', function ({id,clientData}) {
                    console.log('member_join');

                    if (room_s != 'observable-temp') {
                        $('.messages-inner').show();
                        $('.start-listening-inner').hide();
                    }else{

                        vars.members.push({id,clientData});
                        console.log('vars: ')
                        console.log(vars.members);
                        functions.updateRoomMembers();
                    }
                });

                room.on('member_leave', function ({id}) {

                    if (room_s != 'observable-temp') {
                        $('.messages-inner').fadeOut();
                        //  $('.leave-room').fadeOut();
                        $('.start-listening-inner').fadeIn();
                        $("template_message:not('.no-visible')").remove();
                        $('.card-body').prepend('<span class="GREEN leave-info">User left </span>');
                        setTimeout(function () {
                            $('.leave-info').slideDown().remove();
                        }, 2000);
                    }else{


                        const index = vars.members.findIndex(member => member.id === id);
                      if(index >= 0)
                        vars.members.splice(index, 1);

                        functions.updateRoomMembers();
                    }
                });

                room.on('members', members => {

                    if (room_s != 'observable-temp') {
                        const isOfferer = members.length >= 2;
                        functions.startWebRTC(isOfferer);
                    } else {

                        vars.members = members;
                        functions.updateRoomMembers();
                        functions.tempRoomData();
                    }

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
                //
                // pc.onaddstream = event => {
                //     $('#user_video')[0].srcObject = event.stream;
                // };
                //
                // navigator.mediaDevices.getUserMedia({
                //     audio: true,
                //     video: true,
                // }).then(stream => {
                //     // Display your local video in #localVideo element
                //     $('#my_video')[0].srcObject = stream;
                //     // Add your stream to be sent to the conneting peer
                //     pc.addStream(stream);
                // }, error => console.log(error));

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
                room.unsubscribe();
                // drone.unsubscribe(room.name);
                $('.conn-info').remove();
                $('.leave-room').remove();
                $('.messages-inner').fadeOut();
                $('.leave-room').fadeOut();
                $('.start-listening-inner').fadeIn();
                $("template_message:not('.no-visible')").remove();
            },
            updateRoomMembers: function () {
                $('.room-members').html('');

                $.each(vars.members, function (key, value) {


                    if (value['clientData'] && value["id"] != drone.clientId)
                        $('.room-members').append('<div class="member-event" data-id="'+value["id"]+'">'+ value["clientData"]["name"]+'</div>');
                        $('.member-event').on('click', function () {

                        let data = {
                            id: $(this).attr('data-id'),
                            type:'ASK',
                            sender_id: drone.clientId
                        };
                            functions.sendSignalingMessage(data);

                        });
                });
            },

            /**
             * only socket
             */
            tempRoomData:function(){
                room.on('data', ({id,type,sender_id}) => {

                    switch(type){
                        case 'ASK':
                            if(id == drone.clientId){
                                let index_c = vars.members.findIndex(member => member.id === sender_id );
                                ask = window.confirm( vars.members[index_c]['clientData']['name'] + ' wants to contact, do You agree?');
                                if ( ask ) {
                                    let data = {
                                        id:vars.members[index_c]['id'],
                                        type:'CONFIRM',
                                        sender_id: drone.clientId
                                    }

                                    functions.sendSignalingMessage(data);
                                }else{
                                    let data = {
                                        id:vars.members[index_c]['id'],
                                        type:'DENIED',
                                        sender_id: drone.clientId
                                    }
                                    functions.sendSignalingMessage(data);
                                }
                            }
                        break;
                        case 'CONFIRM':
                            if(id == drone.clientId) {
                                alert('user accepted');
                            }
                            //TO DO łączenie webRTC z pokoikiem
                        break;
                        case 'DENIED':
                            if(id == drone.clientId){
                                alert('user denied');
                            }

                        break;


                    }

                });
            },
            init: function () {

                functions.waitForConnect('observable-temp');
                functions.sendMessageEvent();
                functions.startListening();
            }
        };

        //elementy pobrane
        var $this = this;


        functions.init();

    }
})(jQuery);




