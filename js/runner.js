var sun       = new window.Sun(1.1723328e18, 2.616e8),
    kerbin    = new window.Planet(sun, 6e5,   '#77F', 3.5316e12,    9284.5, 13599840256, { r: 13599840256, phi: -Math.PI }, 0,    Math.PI / 2, 8.4159286e7),
    duna      = new window.Planet(sun, 3.2e5, '#F33', 3.0136321e11, 7915,   20726155264, { r: 19669121365, phi: -Math.PI }, 0.05, Math.PI / 2, 4.7921949e7),
    ship1_man = [[1.907e7, { heading: Math.PI }], [1.924e7, { heading: -Math.PI / 2 }], [1.93e7, { throttle: 0 }]],
    launches  = [
      [1.8872e7, {
        launch_from: kerbin,
        heading:   0.31 * Math.PI,
        throttle:  1,
        max_accel: 0.2,
        maneuvers: ship1_man,
        parent:    sun
      }]
    ],
    size      = 2.3e10,
    world     = { width: size, height: size },
    canvas    = { width: 500, height: 500 },
    renderer  = new window.Renderer(document.getElementById('flightplan'), world, canvas),
    t         = 1.88719e7,
    s         = new window.Simulator(t, [sun, duna, kerbin], 100)
s.track(kerbin)
renderer.zoomTo(1)
s.run(renderer)
for (var i = launches.length; i--; ) {
  s.registerShipLaunch(launches[i])
}
function startListeners(sim, renderer) {
  document.getElementById('pause').addEventListener('click',       function() { sim.togglePaused(renderer) })
  document.getElementById('zoom_in').addEventListener('click',     renderer.zoomIn.bind(renderer))
  document.getElementById('zoom_out').addEventListener('click',    renderer.zoomOut.bind(renderer))
  document.getElementById('faster').addEventListener('click',      sim.faster.bind(sim))
  document.getElementById('slower').addEventListener('click',      sim.slower.bind(sim))
  document.getElementById('prev_target').addEventListener('click', sim.trackPrev.bind(sim))
  document.getElementById('next_target').addEventListener('click', sim.trackNext.bind(sim))
  window.onkeyup = function(e) {
    var key = e.keyCode ? e.keyCode : e.which

    if (key === 27 || key === 32) {
      // esc
      sim.togglePaused(renderer)
    } else if (key === 187) {
      // +
      renderer.zoomIn()
    } else if (key === 189) {
      // -
      renderer.zoomOut()
    } else if (key === 190) {
      // >
      sim.faster()
    } else if (key === 188) {
      // <
      sim.slower()
    } else if (key === 221) {
      // [
      sim.trackNext()
    } else if (key === 219) {
      // ]
      sim.trackPrev()
    }
  }
}

startListeners(s, renderer)
