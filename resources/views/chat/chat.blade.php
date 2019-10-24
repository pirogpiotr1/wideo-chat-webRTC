<div class="content">
    <div class="messages"></div>
    <form class="footer" onsubmit="return false;">
        <input type="text" placeholder="Your message..">
        <button class="BTN SEND" type="submit">Send</button>
    </form>
</div>

<template_message data-template="message">
    <div class="message">
        <div class="message__name"></div>
        <div class="message__bubble"></div>
    </div>
</template_message>
<script>
    $(document).ready(function () {
        var chat = $.fn.initChat({
            user_info:{
                name: "{{ Auth::user()->name }}",
                user_id: "{{ Auth::user()->id }}"
            }
        });
    });
</script>
