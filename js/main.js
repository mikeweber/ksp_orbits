var player;
(function() {
  var mun_start_time = 4 * DAY
  var duna_start_time = 2 * YEAR + 360 * DAY
  var start_time = mun_start_time - 1
  player = FlightPlanner.Sim.initUniverse(0)
  player.zoomTo(new Decimal(1500))
  player.run()
  player.renderer.track(player.sim.getBody('Kerbin'))
  FlightPlanner.Sim.addListeners(player)

  // var stat = new FlightPlanner.View.FlightStatus(player.sim, 1, 'Beginning sim'),
  //     duna = player.sim.getBody('Duna'),
  //     kerbin = player.sim.getBody('Kerbin')
  // $('#status').append(stat.getPanel())
  // kerbin.setTarget(duna)
  // player.sim.observe('after:stepBodies', function(t) {
  //   stat.updateStatus.bind(stat)(t, kerbin)
  // })
  // new MunMission(player, mun_start_time)
  //new DunaMission(player, duna_start_time)
  console.log(window.location.search)
  switch (window.location.search) {
    case '?kerbin_soi':
      new ExitKerbinSOI(player, 0)
      break
    case '?kerbin_duna_transit':
      new KerbinDunaTransit(player, 0, 0)
      break
    case '?duna_soi':
      new ExitDunaSOI(player, 0)
      break
  }
})()
