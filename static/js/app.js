$(document).ready(function () {
    $('.sidenav').sidenav();

    $('.tabs').tabs();

    var modals = $('.modal').modal();

    loadSensores();

    $("#modalAgregarSensor>form").submit(e => {
        e.preventDefault();
        let data = $(e.target).serialize();

        $.post("/api/sensor", data, function (res) {
            $('.modal').modal().closeModal();
            loadSensores();
        })
    })

    $("#add-new-sesion").click(e => {
        var id = getRandomId();

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
                            <select name="sensor_id" required>
                                <option value="" disabled selected>Seleccione opcion</option>

                            </select>
                            <label>Sensor</label>
                        </div>
                        <div class="input-field right-align col s6">
                            <input id="iniciar-sesion right" type="submit"
                                class="cyan darken-1 waves-effect waves-light btn"
                                value="Iniciar sesion" />
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
                <div class="col s12 m6">
                    <canvas id="chart-rt-hr" width="100%" height="400px"></canvas>
                </div>
                <div class="col s12 m6">
                    <canvas id="chart-rt-rr" width="100%" height="400px"></canvas>
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
                <canvas id="chart-rt-centroides" width="100%"></canvas>

            </div>
        </div>
        `)
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
                loadRealtime(id, res["session_id"])
            })
        })
    })

    function loadRealtime(id, sesion_id) {
        setInterval((e) => {
            $.get("/api/sesion?id=" + sesion_id).then(res => {
                i = JSON.parse(res);
                $("#" + id).find("#min-rr").html(i["extras"]["min"]["hr"]);
                $("#" + id).find("#max-rr").html(i["extras"]["max"]["hr"]);
                $("#" + id).find("#avg-rr").html(i["extras"]["promedios"]["hr"]);
                $("#" + id).find("#status-rr").html(i["extras"]["status"]["avgrr"]);
                $("#" + id).find("#min-hr").html(i["extras"]["min"]["rr"]);
                $("#" + id).find("#max-hr").html(i["extras"]["max"]["rr"]);
                $("#" + id).find("#avg-hr").html(i["extras"]["promedios"]["rr"]);
                $("#" + id).find("#sd-hr").html(i["extras"]["stdev"]["hr"]);
                $("#" + id).find("#sd-rr").html(i["extras"]["stdev"]["rr"]);
                $("#" + id).find("#status-sdrr").html(i["extras"]["status"]["sdrr"]);
                $("#" + id).find("#prr50").html(i["extras"]["prr50"]);
                $("#" + id).find("#status-prr50").html(i["extras"]["status"]["prr50"]);

                let charthr = $("#" + id).find("#chart-rt-hr");
                new Chart(charthr, createConfig(i["datos"].map(e => {
                    return { label: e["date"], data: e["HR"] }
                })));
                let chartrr = $("#" + id).find("#chart-rt-rr");
                new Chart(chartrr, createConfig(i["datos"].map(e => {
                    return { label: e["date"], data: e["RR"] }
                })));

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
                })
            })


        }, 1000);
    }
    function createConfig(data) {
        return {
            type: 'line',
            data: {
                labels: data.map(e => e["label"]),
                datasets: [{
                    label: 'My First dataset',
                    backgroundColor: "red",
                    borderColor: "red",
                    data: data.map(e => e["data"]),
                    fill: false,
                    pointRadius: 3,
                    pointHoverRadius: 4,
                    showLine: false // no line shown
                }]
            },
            options: {
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


    $.get("/api/sesiones").then(e => {
        e = JSON.parse(e)
        var table = $("#tb-sesiones");
        table.empty();
        e.filter(f => f.hasOwnProperty("extras")).forEach(i => {
            table.append(`
            <tr>
                <td>${i["_id"]["$oid"]}</td>
                <td>${i["extras"]["min"]["hr"]}</td>
                <td>${i["extras"]["max"]["hr"]}</td>
                <td>${i["extras"]["promedios"]["hr"]}</td>
                <td>${i["extras"]["status"]["avgrr"]}</td>
                <td>${i["extras"]["min"]["rr"]}</td>
                <td>${i["extras"]["max"]["rr"]}</td>
                <td>${i["extras"]["promedios"]["rr"]}</td>
                <td>${i["extras"]["stdev"]["hr"]}</td>
                <td>${i["extras"]["stdev"]["rr"]}</td>
                <td>${i["extras"]["status"]["sdrr"]}</td>
                <td>${i["extras"]["prr50"]}</td>
                <td>${i["extras"]["status"]["prr50"]}</td>
            </tr>
            `);
        });
    })

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
