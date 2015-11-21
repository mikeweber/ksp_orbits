/* globals window Decimal document jQuery */
window.FlightStatus = (function($) {
  'use strict'

  var klass = function FlightStatus(sim, refresh_interval, initial_message) {
    this.sim              = sim
    this.refresh_interval = refresh_interval * 1000
    this.setMessage(initial_message)
    this.panels           = {}
    this.panel            = this.initPanel()
    this.last_run = new Date()
  }

  klass.prototype.getPanel = function() {
    return this.panel
  }

  klass.prototype.initPanel = function() {
    return $('<dl>')
      .append(this.makeTitle('Launch Date'))
      .append(this.getPanelFor('launch_date'))
      .append(this.makeTitle('T+'))
      .append(this.getPanelFor('mission_time'))
      .append(this.makeTitle('SOI'))
      .append(this.getPanelFor('soi'))
      .append(this.makeTitle('Distance from Kerbin'))
      .append(this.getPanelFor('kerbin_distance'))
      .append(this.makeTitle('Distance from Duna'))
      .append(this.getPanelFor('duna_distance'))
      .append(this.makeTitle('Velocity'))
      .append(this.getPanelFor('vel'))
      .append(this.makeTitle('Throttle'))
      .append(this.getPanelFor('throttle'))
      .append(this.makeTitle('Altitude'))
      .append(this.getPanelFor('r'))
      .append(this.makeTitle('Phi'))
      .append(this.getPanelFor('phi'))
      .append(this.makeTitle('Ap'))
      .append(this.getPanelFor('ap'))
      .append(this.makeTitle('Pe'))
      .append(this.getPanelFor('pe'))
      .append(this.makeTitle('Eccentricity'))
      .append(this.getPanelFor('ecc'))
      .append(this.makeTitle('Zenith angle'))
      .append(this.getPanelFor('gamma'))
      .append(this.makeTitle('Prograde'))
      .append(this.getPanelFor('prograde'))
      .append(this.makeTitle('Heading'))
      .append(this.getPanelFor('heading'))
      .append(this.makeTitle('Status'))
      .append(this.getPanelFor('message'))
  }

  klass.prototype.updateStatus = function(t, ship) {
    var now = new Date()
    if (now - this.last_run < this.refresh_interval) return

    this.updateStat('launch_date', window.Helper.convertTimeToDate(ship.getLaunchTime()), ship.getLaunchTime())
    this.updateStat('mission_time', window.Helper.convertTimeToDate(ship.getMissionTime(t)), ship.getMissionTime(t))
    this.updateStat('soi', ship.getParent().name)
    this.updateStat('kerbin_distance', window.CelestialObject.calcObjectDistance(ship, this.sim.getPlanet('Kerbin')).dividedBy(1000).round() + 'km')
    this.updateStat('duna_distance', window.CelestialObject.calcObjectDistance(ship, this.sim.getPlanet('Duna')).dividedBy(1000).round() + 'km')
    this.updateStat('vel', window.Helper.roundTo(ship.getVelocity(), 1) + 'm/s')
    this.updateStat('throttle', window.Helper.roundTo(new Decimal(ship.getThrottle()), 1))
    this.updateStat('prograde', window.Helper.radianToDegrees(ship.getPrograde()).round())
    this.updateStat('r', ship.pos.r.round().dividedBy(1000) + 'km')
    this.updateStat('phi', window.Helper.radianToDegrees(ship.pos.phi).round())
    this.updateStat('heading', window.Helper.radianToDegrees(ship.heading).round() + ' (' + (ship.use_absolute_heading ? 'abs' : 'rel') + ')')
    this.updateStat('message', this.getMessage())
    var params = ship.calcOrbitalParams()
    this.updateStat('ap', params.ap.round().dividedBy(1000) + 'km')
    this.updateStat('pe', params.pe.round().dividedBy(1000) + 'km')
    this.updateStat('gamma', '' + window.Helper.radianToDegrees(ship.pos.phi.minus(ship.getPrograde())).round())
    this.updateStat('ecc', window.Helper.roundTo(ship.getEccentricity(), 4))

    this.last_run = now
  }

  klass.prototype.makeTitle = function(title) {
    return $('<dt>').html(title)
  }

  klass.prototype.updateStat = function(panel_id, stat, title) {
    this.getPanelFor(panel_id).html('' + stat)
    this.getPanelFor(panel_id).prop('title', title)
  }

  klass.prototype.getPanelFor = function(panel_id) {
    if (!this.panels[panel_id]) this.panels[panel_id] = this.makeDefinition()

    return this.panels[panel_id]
  }

  klass.prototype.getMissionTimePanel = function() {
  }

  klass.prototype.makeDefinition = function() {
    return $('<dd>')
  }

  klass.prototype.setMessage = function(message) {
    this.message = message
  }

  klass.prototype.getMessage = function() {
    return this.message
  }

  return klass
})(jQuery)

var player = initUniverse()
player.renderer.zoomTo(new Decimal(200))
player.sim.run(player.renderer)
player.sim.track(player.sim.getPlanet('ike'))
startListeners(jQuery, player.sim, player.renderer)
addManeuvers(player.sim)

function initUniverse() {
  'use strict'

  var sun       = new window.Sun(1.1723328e18, 2.616e8),
      kerbin    = new window.Planet('Kerbin', sun,    6e5,   '#7777FF', 3.5316e12,    13599840256, -Math.PI,       0,    8.4159286e7),
      duna      = new window.Planet('Duna',   sun,    3.2e5, '#FF3333', 3.0136321e11, 20726155264, -Math.PI,       0.05, 4.7921949e7),
      mun       = new window.Planet('Mün',    kerbin, 2.0e5, '#DDDDDD', 6.5138398e10, 1.2e7,       -Math.PI * 1.7, 0,    2.4295591e6),
      minmus    = new window.Planet('Minmus', kerbin, 6.0e5, '#A9D0D5', 1.7658000e9,  4.7e7,       -Math.PI * 0.9, 0,    2.2474284e6),
      ike       = new window.Planet('Ike',    duna,   1.3e5, '#999999', 1.8568369e10, 3.2e6,       -Math.PI * 1.7, 0.03, 1.0495989e6),
      size      = 2.3e10,
      world     = { width: size, height: size },
      canvas    = { width: 500, height: 500 },
      renderer  = new window.Renderer(document.getElementById('flightplan'), world, canvas),
      t         = 1.88719e7,
      s         = new window.Simulator(t, [sun, duna, kerbin, mun, minmus, ike], 128)

  return { sim: s, renderer: renderer}
}

function addManeuvers(sim) {
  'use strict'

  var plan = new window.FlightPlan('ship1', 1.8872e7).scheduleLaunchFromPlanet(
    sim.getPlanet('Kerbin'),
    70000,
    {
      throttle:         0,
      max_accel:        0.2,
      fuel_consumption: 0.19,
      initial_angle:    -Math.PI,
      heading:          0,
      absolute_heading: false,
      target:           sim.getPlanet('Duna')
    }
  )

  var stat = new window.FlightStatus(sim, 1, 'Launching from Kerbin')
  plan.addObserver(stat)
  jQuery('#status').append(stat.getPanel())

  plan.addManeuver(function(t, ship) { sim.track(ship); return true }, 0, false, 1)
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(2.01e5) }, Math.PI, false, 1).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Decelerating on approach to Duna')
    }
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(3.88e5) }, sim.getPlanet('Duna').getPrograde() - (Math.PI * 0.66), true, 1).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Matching velocity and vector with planet')
    }
  })
  plan.addManeuver(function(t, ship) { return ship.getMissionTime(t).greaterThan(4.13e5) }, 0, false, 0).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Waiting for intercept...')
    }
  })
  plan.addSOIChangeManeuver(sim.getPlanet('Sun'), Math.PI * 0.727, true, 1).done(function(observers) {
    for (var i = observers.length; i--; ) {
      observers[i].setMessage('Left Kerbin SOI; setting course')
    }
  })
  plan.addSOIChangeManeuver(sim.getPlanet('Duna'), 0, false, 0).done(function(observers, ship, t) {
    var i
    for (i = observers.length; i--; ) {
      observers[i].setMessage('Near destination; waiting for capture maneuver')
    }
    var ex_time = t.plus(1200)
    plan.addManeuver(function(t) { return t.greaterThan(ex_time) }, Math.PI, false, 1).done(function(observers) {

      for (i = observers.length; i--; ) {
        observers[i].setMessage('Capturing...')
      }

      plan.addManeuver(function(t, ship) { return ship.getVelocity().lt(ship.parent.mu.times(new Decimal(1).dividedBy(ship.pos.r)).sqrt()) }, 0, false, 0).done(function(observers) {

        for (i = observers.length; i--; ) {
          observers[i].setMessage('Capture complete; Shutting down engines')
        }

        var pe = ship.calcOrbitalParams().pe
        plan.addManeuver(function(t, ship) { return ship.pos.r.plus(10).lt(pe) }, -Math.PI, false, 1).done(function(observers) {
          for (i = observers.length; i--; ) {
            observers[i].setMessage('Lowering periapsis and circularizing orbit')
          }

          plan.addManeuver(function(t, ship) { return ship.getEccentricity().lt(0.1) }, 0, false, 0).done(function(observers) {
            for (i = observers.length; i--; ) {
              observers[i].setMessage('Orbit circularized')
            }
          })
        })
      })
    })
  })

  sim.registerShipLaunch(plan)
}

function startListeners($, sim, renderer) {
  'use strict'

  $('#pause').on(      'click', function() { sim.togglePaused() })
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

  $(window).on('keydown', function(e) {
    var key = e.keyCode ? e.keyCode : e.which
    if (key === 187) {
      // +
      renderer.smoothZoomIn()
    } else if (key === 189) {
      // -
      renderer.smoothZoomOut()
    }
  })
}
