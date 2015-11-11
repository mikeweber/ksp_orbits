var sun       = new window.Sun(1.1723328e18, 2.616e8),
    kerbin    = new window.Planet('Kerbin', sun, 6e5,   '#7777FF', 3.5316e12,    9284.5, 13599840256, { r: 13599840256, phi: -Math.PI }, 0,    Math.PI / 2, 8.4159286e7),
    duna      = new window.Planet('Duna',   sun, 3.2e5, '#FF3333', 3.0136321e11, 7915,   20726155264, { r: 19669121365, phi: -Math.PI }, 0.05, Math.PI / 2, 4.7921949e7),
    ship1_man1= new window.Maneuver( ),
    plan      = new window.FlightPlan('ship1', 1.8872e7).scheduleLaunchFromPlanet(
      kerbin,
      sun,
      0.31 * Math.PI,
      {
        throttle:  1,
        max_accel: 0.2,
        target:    duna
      }
    ),
    size      = 2.3e10,
    world     = { width: size, height: size },
    canvas    = { width: 500, height: 500 },
    renderer  = new window.Renderer(document.getElementById('flightplan'), world, canvas),
    t         = 1.88719e7,
    s         = new window.Simulator(t, [sun, duna, kerbin], 100)

plan.addManeuver(function(t, ship) { return t.greaterThan(1.907e7) }, Math.PI, 1).done(function(t, ship) {
  alert('At mission time T+' + ship.getMissionTime(t) + ', Executing maneuver: decelerating')
})
plan.addManeuver(function(t) { return t.greaterThan(1.93e7) }, 0, 0).done(function(t, ship) {
  alert('At mission time T+' + ship.getMissionTime(t) + ', Executing maneuver: shutting off throttle')
})
s.track(kerbin)
renderer.zoomTo(1)
s.registerShipLaunch(plan)
s.run(renderer)

;(function startListeners($, sim, renderer) {
  $('#pause').on(      'click', function() { sim.togglePaused(renderer) })
  $('#zoom_in').on(    'click', renderer.zoomIn.bind(renderer))
  $('#zoom_out').on(   'click', renderer.zoomOut.bind(renderer))
  $('#faster').on(     'click', sim.faster.bind(sim))
  $('#slower').on(     'click', sim.slower.bind(sim))
  $('#prev_target').on('click', sim.trackPrev.bind(sim))
  $('#next_target').on('click', sim.trackNext.bind(sim))
  $(window).on('keyup', function(e) {
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
  })
})(jQuery, s, renderer)
