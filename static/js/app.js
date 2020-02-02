$(document).ready(function () {
    $('.sidenav').sidenav();

    $('.tabs.tabs-transparent').tabs();

    var rts = [];
    var modals = $('.modal').modal();

    loadSensores();
    loadSesiones();
    $(".nav-content>.tabs>.tab:nth-child(2)").click(e => {
        loadSesiones();
    })
    $("#modalAgregarSensor>form").submit(e => {
        e.preventDefault();
        let data = $(e.target).serialize();

        $.post("/api/sensor", data, function (res) {
            $('.modal').modal("close");
            loadSensores();
        })
    })
    $.get("/api/running").then(res => {

        res.forEach(e => {
            var id = getRandomId();
            let a = addTab(id);
            let newsesionstab = a.newsesionstab;
            let newsesionstabs = a.newsesionstabs;
            $(newsesionstab).tabs();
            loadRealtime(id, e)
            $("#" + id).find("#detener-sesion").click(event => {

                $.post("/api/stop", { "sesion_id": e }).then(res => {
                    M.toast({ html: 'Deteniendo captura para sesion ' + res["session_id"] })
                    rts.filter(i => i.session_id == e).forEach(e => {
                        clearInterval(e.interval);
                    })
                    load(id, e);
                })
            });
        })
    })

    function addTab(id) {

        var newsesionstab = $("#newsesionstab");
        var newsesionstabs = $("#newsesionstabs");
        newsesionstab.append(`<li class="tab col s3"><a class="active" href="#${id}">${newsesionstab.find(".tab").length + 1}</a></li>`)
        newsesionstabs.append(`
        <div id="${id}" class="col s12">
            <h6>Sesion</h6>
            <div class="row">
                <form class="col s12">
                    <div class="row">
                        <div class="input-field col s6">
                            <input id="nombre-sesion" name="nombre" type="text" class="validate" required>
                            <label for="nombre-sesion">Nombre</label>
                        </div>

                        <div class="input-field col s6">
                            <input id="descripcion-sesion" name="descripcion" type="text" required
                                class="validate">
                            <label for="descripcion-sesion">Descripcion</label>
                        </div>

                        <div class="input-field col s6">
                            <select id="sensor_id" name="sensor_id" required>
                                <option value="" disabled selected>Seleccione opcion</option>

                            </select>
                            <label>Sensor</label>
                        </div>
                        <div class="input-field right-align col s6">
                            <input id="iniciar-sesion" type="submit"
                                class="cyan darken-1 waves-effect waves-light btn"
                                value="Iniciar sesion" />
                            <input id="detener-sesion" type="button"
                                class="purple darken-1 waves-effect waves-light btn"
                                value="Detener sesion" />
                        </div>
                    </div>

                </form>
            </div>
            <div class="row">
                <ul id="datos" class="collection  with-header">
                    <li class="collection-header">
                        <h5>Datos</h5>
                    </li>
                    <li class="collection-item">
                        <div class="col m6 s12">
                            <ul id="datos" class="collection">
                                <li class="collection-item">Min RR: <span id="min-rr"></span></li>
                                <li class="collection-item">Max RR: <span id="max-rr"></span></li>
                                <li class="collection-item">AVG RR: <span id="avg-rr"></span></li>
                                <li class="collection-item">Estado RR: <span id="status-rr"></span></li>
                                <li class="collection-item">Min HR: <span id="min-hr"></span></li>
                                <li class="collection-item">Max HR: <span id="max-hr"></span></li>
                            </ul>
                        </div>
                        <div class="col m6 s12">
                            <ul id="datos" class="collection">

                                <li class="collection-item">AVG HR: <span id="avg-hr"></span></li>
                                <li class="collection-item">SDHR: <span id="sd-hr"></span></li>
                                <li class="collection-item">SDRR: <span id="sd-rr"></span></li>
                                <li class="collection-item">Estado SDRR <span id="status-sdrr"></span></li>
                                <li class="collection-item">pRR50: <span id="prr50"></span></li>
                                <li class="collection-item">Estado pRR50: <span id="status-prr50"></span></li>
                            </ul>
                        </div>

                    </li>
                </ul>
            </div>
            <div class="row">
                <div class="col s12">
                    <canvas id="chart-rt-hr" width="100%" style="max-height:450px"></canvas>
                </div>
                <div class="col s12">
                    <canvas id="chart-rt-rr" width="100%" style="max-height:450px"></canvas>
                </div>
            </div>
            <div class="row">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>X</th>
                            <th>Y</th>
                        </tr>
                    </thead>

                    <tbody id="tb-centroides">

                    </tbody>
                </table>
            </div>
            <div class="row">
                <canvas id="chart-rr-centroides" width="100%"></canvas>

            </div>
        </div>
        `)

        newsesionstab.tabs();

        return { newsesionstab, newsesionstabs }
    }
    $("#add-new-sesion").click(e => {
        var id = getRandomId();
        let a = addTab(id);
        let newsesionstab = a.newsesionstab;
        let newsesionstabs = a.newsesionstabs;
        $(newsesionstab).tabs();
        $.get("/api/sensors").then(res => {
            res = JSON.parse(res);
            let select = $("#" + id).find("select");
            res.forEach(i => {
                select.append(`<option value="${i["_id"]["$oid"]}">${i["nombre"]}</option>`)
            })
            $('select').formSelect();

        })
        $("#" + id + " form").submit(e => {
            e.preventDefault();
            let data = $(e.target).serialize();

            $.post("/api/begin", data).then(res => {
                M.toast({ html: 'Iniciando captura para sesion ' + res["session_id"] })
                loadRealtime(id, res["session_id"])
                $("#" + id).find("#detener-sesion").click(e => {

                    $.post("/api/stop", { "sesion_id": res["session_id"] }).then(res => {
                        M.toast({ html: 'Deteniendo captura para sesion ' + res["session_id"] })
                        rts.filter(e => e.session_id == res["session_id"]).forEach(e => {
                            clearInterval(e);
                        })
                        load(id, res["session_id"]);
                        loadSesiones();

                    })
                });
            })


        })
    })

    function load(id, sesion_id) {
        $.get("/api/sesion?id=" + sesion_id).then(res => {
            i = JSON.parse(res);
            $("#" + id).find("#nombre-sesion").val(i["nombre"]);
            $("#" + id).find("#descripcion-sesion").val(i["descripcion"]);
            $("#" + id).find("#sensor_id").attr("disabled", true)
            $("#" + id).find("#sensor_id").val(i["sensor_id"]);
            $("#" + id).find("#sensor_id").formSelect();
            $("#" + id).find("#min-hr").html(i["extras"]["min"]["hr"]);
            $("#" + id).find("#max-hr").html(i["extras"]["max"]["hr"]);
            $("#" + id).find("#avg-hr").html(i["extras"]["promedios"]["hr"]);
            $("#" + id).find("#status-rr").html(i["extras"]["status"]["avgrr"]);
            $("#" + id).find("#min-rr").html(i["extras"]["min"]["rr"]);
            $("#" + id).find("#max-rr").html(i["extras"]["max"]["rr"]);
            $("#" + id).find("#avg-rr").html(i["extras"]["promedios"]["rr"]);
            $("#" + id).find("#sd-hr").html(i["extras"]["stdev"]["hr"]);
            $("#" + id).find("#sd-rr").html(i["extras"]["stdev"]["rr"]);
            $("#" + id).find("#status-sdrr").html(i["extras"]["status"]["sdrr"]);
            $("#" + id).find("#prr50").html(i["extras"]["prr50"]);
            $("#" + id).find("#status-prr50").html(i["extras"]["status"]["prr50"]);

            let charthr = $("#" + id).find("#chart-rt-hr");
            new Chart(charthr, createConfig(i["datos"]["HR"].map(e => {
                return { label: e["time"], data: e["HR"] }
            }), "HR", "red"));
            let chartrr = $("#" + id).find("#chart-rt-rr");
            new Chart(chartrr, createConfig(i["datos"]["RR"].map(e => {
                return { label: e["date"], data: e["RR"] }
            }), "RR", "#FFAA00"));

            $.get("/api/sesion/cluster?id=" + sesion_id).then(res => {
                res = JSON.parse(res);
                let tablecentroides = $("#" + id).find("#tb-centroides");
                tablecentroides.empty();
                res.forEach((e, i) => {
                    tablecentroides.append(`
                <tr>
                    <td>${i}</td>
                    <td>${e[0]}</td>
                    <td>${e[1]}</td>
                </tr>
                `);
                })

                new Chart($("#" + id).find("#chart-rr-centroides"), createConfigTwo(
                    {
                        "dataset1": {
                            "labels": i["datos"]["RR"].map(e => e["date"]),
                            "data": i["datos"]["RR"].map(e => e["RR"])
                        },
                        "dataset2": {
                            "labels": res.map(e => e[1]),
                            "data": res.map(e => e[0])
                        }

                    }, "RR", "#FFAA00"));

            })
        })

    }
    function loadRealtime(id, sesion_id) {
        var interval = setInterval((e) => {
            load(id, sesion_id)
        }, 1000);
        rts.push({
            "session_id": sesion_id,
            "interval": interval
        })
    }

    function createConfigTwo(data, name, color) {
        return {
            type: 'line',
            data: {
                labels: data["dataset1"]["labels"],
                datasets: [{
                    label: "Centroides",
                    backgroundColor: "black",
                    borderColor: "black",
                    data: data["dataset2"]["data"],
                    labels: data["dataset2"]["labels"],
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 4,
                    showLine: false // no line shown
                }, {
                    label: name,
                    backgroundColor: color,
                    borderColor: color,
                    data: data["dataset1"]["data"],
                    labels: data["dataset1"]["labels"],
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 4,
                    showLine: false // no line shown
                }
                ]
            },
            options: {
                animation: false,
                responsive: true,
                legend: {
                    display: true
                },
                elements: {
                    point: {
                        pointStyle: "circle"
                    }
                }
            }
        };
    }

    function createConfig(data, name, color) {
        return {
            type: 'line',
            data: {
                labels: data.map(e => e["label"]),
                datasets: [{
                    label: name,
                    backgroundColor: color,
                    borderColor: color,
                    data: data.map(e => e["data"]),
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 4,
                    showLine: false // no line shown
                }]
            },
            options: {
                animation: false,
                responsive: true,
                legend: {
                    display: true
                },
                elements: {
                    point: {
                        pointStyle: "circle"
                    }
                }
            }
        };
    }

    function loadSesiones() {


        $.get("/api/sesiones").then(e => {
            e = JSON.parse(e)
            var table = $("#tb-sesiones");
            table.empty();
            e.filter(f => f.hasOwnProperty("extras")).forEach(i => {
                table.append(`
            <tr>
                <td>${i["_id"]["$oid"]}</td>
                <td>${parseFloat(i["extras"]["min"]["hr"]).toFixed(2)}</td>
                <td>${parseFloat(i["extras"]["max"]["hr"]).toFixed(2)}</td>
                <td>${parseFloat(i["extras"]["promedios"]["hr"]).toFixed(2)}</td>
                <td>${i["extras"]["status"]["avgrr"]}</td>
                <td>${parseFloat(i["extras"]["min"]["rr"]).toFixed(2)}</td>
                <td>${parseFloat(i["extras"]["max"]["rr"]).toFixed(2)}</td>
                <td>${parseFloat(i["extras"]["promedios"]["rr"]).toFixed(2)}</td>
                <td>${parseFloat(i["extras"]["stdev"]["hr"]).toFixed(2)}</td>
                <td>${parseFloat(i["extras"]["stdev"]["rr"]).toFixed(2)}</td>
                <td>${i["extras"]["status"]["sdrr"]}</td>
                <td>${parseFloat(i["extras"]["prr50"]).toFixed(2)}</td>
                <td>${i["extras"]["status"]["prr50"]}</td>
                <td><button id="${i["_id"]["$oid"]}" class="waves-effect waves-light btn">Ver</button></td>
            </tr>
            `);

                $("#" + i["_id"]["$oid"]).click(e => {
                    var id = getRandomId();
                    let modal = $("#verSesion");
                    modal.empty()
                    modal.append(`
                <div id="${id}" class="col s12">
                    <h6>Sesion</h6>
                    <div class="row">
                        <ul id="datos" class="collection  with-header">
                            <li class="collection-header">
                                <h5>Datos</h5>
                            </li>
                            <li class="collection-item">
                                <div class="col m6 s12">
                                    <ul id="datos" class="collection">
                                        <li class="collection-item">Min RR: <span id="min-rr"></span></li>
                                        <li class="collection-item">Max RR: <span id="max-rr"></span></li>
                                        <li class="collection-item">AVG RR: <span id="avg-rr"></span></li>
                                        <li class="collection-item">Estado RR: <span id="status-rr"></span></li>
                                        <li class="collection-item">Min HR: <span id="min-hr"></span></li>
                                        <li class="collection-item">Max HR: <span id="max-hr"></span></li>
                                    </ul>
                                </div>
                                <div class="col m6 s12">
                                    <ul id="datos" class="collection">
        
                                        <li class="collection-item">AVG HR: <span id="avg-hr"></span></li>
                                        <li class="collection-item">SDHR: <span id="sd-hr"></span></li>
                                        <li class="collection-item">SDRR: <span id="sd-rr"></span></li>
                                        <li class="collection-item">Estado SDRR <span id="status-sdrr"></span></li>
                                        <li class="collection-item">pRR50: <span id="prr50"></span></li>
                                        <li class="collection-item">Estado pRR50: <span id="status-prr50"></span></li>
                                    </ul>
                                </div>
        
                            </li>
                        </ul>
                    </div>
                    <div class="row">
                        <div class="col s12 m6">
                            <canvas id="chart-rt-hr" width="100%" style="max-height:550px"></canvas>
                        </div>
                        <div class="col s12 m6">
                            <canvas id="chart-rt-rr" width="100%" style="max-height:550px"></canvas>
                        </div>
                    </div>
                    <div class="row">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>X</th>
                                    <th>Y</th>
                                </tr>
                            </thead>
        
                            <tbody id="tb-centroides">
        
                            </tbody>
                        </table>
                    </div>
                    <div class="row">
                        <canvas id="chart-rr-centroides" width="100%"></canvas>
        
                    </div>
                    <div class="row center-align">
                        <button id="descargar-pdf" class="waves-effect waves-light btn  lime accent-4">Descargar PDF</button>
                    </div>
                    
                </div>
                `)
                    load(id, i["_id"]["$oid"])
                    modal.modal('open');

                    $("#" + id).find("#descargar-pdf").click(function (event) {
                        var quotes = document.getElementById(id);
                        $("#descargar-pdf").hide()
                        html2canvas(quotes).then(function (canvas) {

                            var img = canvas.toDataURL("image/png");
                            var doc = new jsPDF("p", "mm", "tabloid");
                            var width = doc.internal.pageSize.getWidth();
                            var height = doc.internal.pageSize.getHeight();
                            doc.addImage(img, 'JPEG', 0, 0, width, height);
                            doc.save('informe' + id + '.pdf');
                        });
                        $("#descargar-pdf").show()
                    });
                })
            });
        })
    }
    function loadSensores() {
        $.get("/api/sensors").then(e => {
            e = JSON.parse(e)
            var table = $("#tb-sensores");
            table.empty();
            e.forEach(i => {
                table.append(`
            <tr>
                <td>${i["_id"]["$oid"]}</td>
                <td>${i["nombre"]}</td>
                <td>${i["descripcion"]}</td>
                <td>${i["puerto"]}</td>
            </tr>
            `);
            });
        })

    }

    function getRandomId() {
        return Math.floor(Math.random() * 100000);
    }
});
