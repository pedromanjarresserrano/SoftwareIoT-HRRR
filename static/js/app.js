$(document).ready(function () {
    $('.sidenav').sidenav();

    $('.tabs').tabs();

    $.get("/api/sensors").then(e => {
        //  alert(e)
    })


    $.get("/api/sesiones").then(e => {
        e = JSON.parse(e)
        console.log(e);
$("#tb-sesiones")
    })
});
