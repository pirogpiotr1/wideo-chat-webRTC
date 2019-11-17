<div class="video-inner">
    <div class="video-wrapper" >
        <video id="my_video" autoplay muted></video>
        <video id="user_video" autoplay></video>
    </div>

</div>

<div class="messages-inner">
    <div class="messages"></div>
    <form class="footer" onsubmit="return false;">
        <input type="text" placeholder="Your message..">
        <button class="BTN SEND" type="submit">Send</button>
    </form>
</div>

<template_message data-template="message" class="no-visible">
    <div class="message">
        <div class="message__name"></div>
        <div class="message__bubble"></div>
    </div>
</template_message>

<div class="start-listening-inner">
    <div class="start-listening-wraper">
            <button id="start-listening" >FIND ROOM </button>
    </div>

</div>

<script>
    $(document).ready(function () {
        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });

        $.fn.initChat({
            user_info:{
                name: "{{ Auth::user()->name }}",
                user_id: "{{ Auth::user()->id }}",
                room_name : "{{$room_name}}"
            },
            ajax:{
                startListening: '/home/start_listening'
            }
        });
    });
</script>
