/* global window Decimal Object console */
const YEAR = 9203545,
      WEEK = 201600,
      DAY  = 21600,
      HOUR = 3600,
      MIN  = 60

window.CelestialObject = (function() {
  'use strict'

  var klass = function CelestialObject() {}

  klass.prototype.initializeParameters = function(name, parent, radius, color, mu, v, semimajor_axis, pos, e, prograde) {
    this.name     = name
    this.parent   = parent
    this.radius   = radius
    this.color    = color
    this.mu       = new Decimal(mu)
    this.v        = new Decimal(v)
    this.a        = new Decimal(semimajor_axis)
    this.pos      = { 'r': new Decimal(pos.r), phi: new Decimal('' + pos.phi) }
    this.m        = this.pos.phi
    this.e        = new Decimal(e)
    this.prograde = new Decimal('' + prograde)
    this.last_breadcrumb  = 0
    this.breadcrumb_delta = WEEK
    this.trail_length     = 25
    this.breadcrumbs      = []
  }

  klass.prototype.getOrbitalPeriod = function() {
    return this.getSemiMajorAxis().toPower(3).dividedBy(this.mu).sqrt().times('' + (2 * Math.PI))
  }

  klass.prototype.getSemiMajorAxis = function() {
    // TODO: figure this out
    return new Decimal(1000)
  }

  klass.calcObjectDistance = function(obj1, obj2) {
    if (window.Helper.isBlank(obj1) || window.Helper.isBlank(obj2)) return
    var coord1 = obj1.getCoordinates(),
        coord2 = obj2.getCoordinates()
    return klass.calcCoordDistance(coord1, coord2)
  }

  klass.calcCoordDistance = function(coord1, coord2) {
    return coord1.x.minus(coord2.x).toPower(2).plus(coord1.y.minus(coord2.y).toPower(2)).sqrt()
  }

  klass.prototype.setTime = function(t) {
    this.launch_time = new Decimal(t)
    this.t = new Decimal(t)
  }

  klass.prototype.getLaunchTime = function() {
    return this.launch_time
  }

  klass.prototype.step = function(dt) {
    this.t = this.t.plus(dt)
    var one = new Decimal(1),
        two = new Decimal(2),
        n   = this.mu.plus(this.parent.mu).dividedBy(this.a.toPower(3)).sqrt(),
        M   = n.times(this.t).plus(this.m),
        e   = this.e,
        S   = new Decimal('' + Math.sin(-M)),
        C   = new Decimal('' + Math.cos(-M)),
        phi = new Decimal('' + Math.atan2(one.minus(e.toPower(2)).times(S), C.minus(e))),
        v   = M.plus(two.times(e).times('' + Math.sin(M))).plus(new Decimal(1.25).times(e.toPower(2)).times(two.times(M))),
        r   = this.a.times(one.minus(e.toPower(2)).dividedBy(one.plus(e.times('' + Math.cos(v)))))
        // phi = new Decimal('' + Math.atan2(e.times('' + Math.sin(v)), one.plus(e.times('' + Math.cos(v)))))
    this.pos = { 'r': r, phi: phi }
    this.dropBreadcrumb(this.t)
  }

  klass.prototype.getHeadingX = function() {
    return new Decimal('' + Math.cos(this.getHeading()))
  }

  klass.prototype.getHeadingY = function() {
    return new Decimal('' + Math.sin(this.getHeading()))
  }

  klass.prototype.getHeading = function() {
    return this.getPrograde()
  }

  klass.prototype.getProgradeX = function() {
    return new Decimal('' + Math.cos(this.getPrograde()))
  }

  klass.prototype.getProgradeY = function() {
    return new Decimal('' + Math.sin(this.getPrograde()))
  }

  klass.prototype.getPrograde = function() {
    return this.prograde
  }

  klass.prototype.getParentCoordinates = function() {
    return this.parent.getCoordinates()
  }

  klass.prototype.getLocalCoordinates = function() {
    return klass.posToCoordinates(this.pos)
  }

  klass.prototype.getCoordinates = function() {
    return klass.posToCoordinates(this.pos)
  }

  klass.posToCoordinates = function(pos) {
    return {
      x: pos.r.times('' + Math.cos(pos.phi)),
      y: pos.r.times('' + Math.sin(pos.phi))
    }
  }

  klass.prototype.getGravityWellX = function() {
    return new Decimal('' + Math.cos(this.pos.phi))
  }

  klass.prototype.getGravityWellY = function() {
    return new Decimal('' + Math.sin(this.pos.phi))
  }

  klass.prototype.render = function(renderer) {
    var ctx          = renderer.context,
        world_coords = this.getCoordinates(),
        coords       = renderer.convertWorldToCanvas(world_coords),
        planet_radius= this.getRadius(renderer),
        soi_radius   = this.getSOIRadius(renderer)
    ctx.beginPath()
    ctx.arc(coords.x, coords.y, planet_radius, 0, 2 * Math.PI)
    ctx.fillStyle = this.color
    ctx.fill()
    if (soi_radius && soi_radius > planet_radius) {
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, soi_radius, 0, 2 * Math.PI)
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  klass.prototype.getSOIRadius = function(renderer) {
    return null
  }

  klass.prototype.dropBreadcrumb = function(t) {
    if (t - this.last_breadcrumb < this.breadcrumb_delta) { return }

    this.breadcrumbs.push({ parent: this.parent, pos: Object.create(this.pos) })
    this.last_breadcrumb = t
    if (this.breadcrumbs.length >= this.trail_length) {
      this.breadcrumbs.shift()
    }
  }

  klass.prototype.renderBreadcrumbs = function(renderer) {
    var ctx = renderer.context
    for (var i = this.breadcrumbs.length; i--; ) {
      var el     = this.breadcrumbs[i],
          coords = renderer.convertLocalToCanvas(el.parent, el.pos)
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, 1, 0, 2 * Math.PI)
      var color = window.Helper.shadeRGBColor(this.color, -(this.breadcrumbs.length - i) * 0.005)
      ctx.fillStyle = color
      ctx.fill()
    }
  }

  klass.prototype.getRadius = function(renderer) {
    return Math.max(renderer.scaleWorldToCanvasX(this.radius), 4)
  }

  klass.prototype.getVelocity = function() {
    return this.v
  }

  klass.prototype.getMissionTime = function(t) {
    return t.minus(this.launch_time)
  }

  klass.prototype.registerFlightPlan = function() {}

  klass.prototype.runManeuvers = function(t) {
    if (this.plan) {
      this.plan.activateManeuvers(t)
    }
  }

  return klass
})()

window.Planet = (function() {
  'use strict'

  var klass = function Planet(name, parent, radius, color, mu, v, semimajor_axis, pos, e, prograde, soi) {
    this.initializeParameters(name, parent, radius, color, mu, v, semimajor_axis, pos, e, prograde)
    this.soi          = soi
    this.trail_length = Math.floor(this.getOrbitalPeriod() / WEEK)
  }

  klass.prototype = Object.create(window.CelestialObject.prototype)
  klass.prototype.constructor = klass

  klass.prototype.getSemiMajorAxis = function() {
    return this.a
  }

  klass.prototype.getPrograde = function() {
    return this.pos.phi.minus('' + Math.PI / 2)
  }

  klass.prototype.inSoi = function(ship) {
    var ship_coords = ship.getCoordinates(),
        planet_coords = this.getCoordinates()
    // Optimize colision; only check absolute position if there is any chance the ship is near the planet
    if (ship_coords.x.minus(planet_coords.x).abs().gt(this.soi) || ship_coords.y.minus(planet_coords.y).abs().gt(this.soi)) return false
    return window.CelestialObject.calcCoordDistance(planet_coords, ship_coords).lessThan(this.soi)
  }

  klass.prototype.getSOIRadius = function(renderer) {
    return renderer.scaleWorldToCanvasX(this.soi)
  }

  return klass
})()

window.Sun = (function() {
  'use strict'

  var klass = function Sun(mu, radius) {
    this.initializeParameters('Sun', null, radius, '#FFFF00', mu, 0, 0, { 'r': 0, phi: 0 }, 0, 0, 0)
  }

  klass.prototype = Object.create(window.CelestialObject.prototype)
  klass.prototype.constructor = klass

  klass.prototype.step = function() {}

  klass.prototype.getParentCoordinates = function() {
    return { x: new Decimal(0), y: new Decimal(0) }
  }
  klass.prototype.dropBreadcrumb = function() {}
  klass.prototype.renderBreadcrumbs = function() {}
  klass.prototype.getOrbitalPeriod = function() {}

  return klass
})()

window.Ship = (function() {
  'use strict'

  var klass = function Ship(  name, parent, radius,               v,    pos,    prograde, heading) {
    this.initializeParameters(name, parent, radius, '#FFFFFF', 0, v, 0, pos, 0, prograde)
    this.setHeading(heading)
    this.breadcrumb_delta = DAY
    this.nearest_approach = null
    this.accel            = new Decimal(0)
    this.maneuvers        = []
    this.observers        = []
  }

  klass.prototype = Object.create(window.CelestialObject.prototype)
  klass.prototype.constructor = klass

  klass.prototype.dropBreadcrumb = function(t) {
    if (t - this.last_breadcrumb < this.breadcrumb_delta) return

    this.breadcrumbs.push({ parent: this.parent, pos: Object.create(this.pos) })
    this.last_breadcrumb = t
    if (this.breadcrumbs.length >= this.trail_length) {
      this.breadcrumbs.shift()
    }
  }

  klass.prototype.setManeuvers = function(maneuvers) {
    this.maneuvers = maneuvers
  }

  klass.prototype.setTarget = function(target) {
    this.target = target
  }

  klass.prototype.trackNearestApproach = function(t) {
    if (!this.getTarget()) { return }
    var d = window.CelestialObject.calcObjectDistance(this, this.getTarget())
    if (this.nearest_approach === null || d < this.nearest_approach) {
      this.nearest_approach = d
      this.time_of_nearest_appraoch = t
    }
  }

  klass.prototype.getTarget = function() {
    return this.target
  }

  klass.prototype.step = function(dt) {
    this.t = this.t.plus(dt)
    var gravity    = this.parent.mu.plus(this.mu).dividedBy(this.pos.r.toPower(2)).times(-1),
        g_x        = gravity.times(this.getGravityWellX()),
        g_y        = gravity.times(this.getGravityWellY()),
        a_x        = this.accel.times(this.getHeadingX()),
        a_y        = this.accel.times(this.getHeadingY()),
        accel_x    = a_x.plus(g_x).times(dt),
        accel_y    = a_y.plus(g_y).times(dt),
        vel_x      = this.v.times(this.getProgradeX()),
        vel_y      = this.v.times(this.getProgradeY()),
        old_coords = this.getLocalCoordinates(),
        new_x      = old_coords.x.plus(vel_x.times(dt).plus(accel_x.times(dt).dividedBy(2))),
        new_y      = old_coords.y.plus(vel_y.times(dt).plus(accel_y.times(dt).dividedBy(2))),
        new_coords = { x: new_x, y: new_y }
    this.alterVelocity(vel_x.plus(accel_x), vel_y.plus(accel_y))
    this.alterPrograde(vel_x.plus(accel_x), vel_y.plus(accel_y))
    this.setPosition(new_coords)
    this.trackNearestApproach(this.t)
    this.dropBreadcrumb(this.t)
    this.updateObservers(this.t)
  }

  klass.prototype.setMaxAcceleration = function(accel) {
    this.max_accel = new Decimal(accel)
  }

  klass.prototype.setThrottle = function(throttle) {
    if (window.Helper.isBlank(throttle)) return

    if (throttle < 0) throttle = 0
    if (throttle > 1) throttle = 1
    this.accel = this.max_accel.times(throttle)
  }

  klass.prototype.setPosition = function(coords) {
    var distance = coords.x.toPower(2).plus(coords.y.toPower(2)).sqrt(),
        phi      = new Decimal('' + Math.atan2(coords.y, coords.x))

    this.pos = { 'r': distance, phi: phi }
  }

  klass.prototype.setPositionUsingPosition = function(pos) {
    this.pos = { 'r': new Decimal(pos.r), phi: new Decimal(pos.phi)}
  }

  klass.prototype.setParent = function(parent) {
    this.parent = parent
  }

  klass.prototype.setVelocity = function(vel) {
    this.v = vel
  }

  klass.prototype.setPostion = function(pos) {
    this.pos = pos
  }

  klass.prototype.setPrograde = function(prograde) {
    this.prograde = prograde
  }

  klass.prototype.setHeading = function(heading) {
    if (window.Helper.isBlank(heading)) return

    this.heading = this.getPrograde().plus('' + heading)
  }

  klass.prototype.alterVelocity = function(vel_x, vel_y) {
    this.v = vel_x.toPower(2).plus(vel_y.toPower(2)).sqrt()
  }

  klass.prototype.alterPrograde = function(vel_x, vel_y) {
    this.prograde = new Decimal('' + Math.atan2(vel_y, vel_x))
  }

  klass.prototype.getCoordinates = function() {
    var parent = this.parent.getCoordinates(),
        pos    = window.CelestialObject.posToCoordinates(this.pos)
    return { x: pos.x.plus(parent.x), y: pos.y.plus(parent.y) }
  }

  klass.prototype.getHeading = function() {
    return this.heading
  }

  klass.prototype.getRadius = function() {
    return 2
  }

  klass.prototype.registerFlightPlan = function(flight_plan) {
    this.plan = flight_plan
  }

  klass.prototype.addObserver = function(observer) {
    this.observers.push(observer)
  }

  klass.prototype.updateObservers = function(t) {
    for (var i = this.getObservers().length; i--; ) {
      this.getObservers()[i].updateStatus(t, this)
    }
  }

  klass.prototype.getObservers = function() {
    return this.observers
  }

  return klass
})()

window.Renderer = (function() {
  'use strict'

  var klass = function Renderer(canvas, world_size, canvas_size) {
    this.context      = canvas.getContext('2d')
    this.context.font = '12px "Times New Roman"'
    this.world_size   = { 'width': new Decimal(world_size.width),  'height': new Decimal(world_size.height) }
    this.canvas_size  = { 'width': new Decimal(canvas_size.width), 'height': new Decimal(canvas_size.height) }
    this.origin       = { x: this.canvas_size.width / 2, y: this.canvas_size.height / 2 }
    this.offset       = { x: 0, y: 0 }
    this.zoom         = new Decimal(1)
    this.initCanvas(canvas)
  }

  klass.prototype.zoomOut = function() {
    this.zoom = this.zoom.times(0.2)
  }

  klass.prototype.zoomIn = function() {
    this.zoom = this.zoom.times(5)
  }

  klass.prototype.zoomTo = function(zoom) {
    this.zoom = this.zoom.times(zoom)
  }

  klass.prototype.initCanvas = function(canvas) {
    canvas.width        = this.canvas_size.width
    canvas.height       = this.canvas_size.height
    canvas.style.width  = this.canvas_size.width
    canvas.style.height = this.canvas_size.height
  }

  klass.prototype.clear = function() {
    this.context.beginPath()
    this.context.rect(0, 0, this.canvas_size.width, this.canvas_size.height)
    this.context.fillStyle = '#000000'
    this.context.fill()
  }

  klass.prototype.print = function(text, x, y) {
    this.context.fillStyle = '#FFF'
    this.context.fillText(text, x, y)
  }

  klass.prototype.convertLocalToCanvas = function(parent, local_pos) {
    var parent_coords = parent.getCoordinates(),
        local_coords  = window.CelestialObject.posToCoordinates(local_pos)
    return this.convertWorldToCanvas({ x: parent_coords.x.plus(local_coords.x), y: parent_coords.y.plus(local_coords.y) })
  }

  klass.prototype.convertWorldToCanvas = function(coords) {
    return {
      x: this.scaleWorldToCanvasX(coords.x.minus(this.offset.x)).plus(this.origin.x),
      y: this.scaleWorldToCanvasY(coords.y.minus(this.offset.y)).plus(this.origin.y)
    }
  }

  klass.prototype.scaleWorldToCanvasX = function(point) {
    return new Decimal(point).dividedBy(this.world_size.width).times(this.canvas_size.width / 2).times(this.zoom)
  }

  klass.prototype.scaleWorldToCanvasY = function(point) {
    return new Decimal(point).dividedBy(this.world_size.height).times(this.canvas_size.height / 2).times(this.zoom)
  }

  return klass
})()

window.Simulator = (function() {
  'use strict'

  var klass = function Simulator(time, bodies, tick_size, debug) {
    this.t         = new Decimal(time)
    this.setBodies(bodies)
    this.tick_size = tick_size
    this.running   = false
    this.debugger  = debug
    this.launches  = []
  }

  klass.prototype.track = function(celestial_object) {
    this.tracking = celestial_object
  }

  klass.prototype.getPlanet = function(name) {
    for (var i = this.bodies.length; i--; ) {
      if (this.bodies[i].name === name) return this.bodies[i]
    }
  }

  klass.prototype.trackNext = function() {
    this.moveTracker(1)
  }

  klass.prototype.trackPrev = function() {
    this.moveTracker(-1)
  }

  klass.prototype.moveTracker = function(i) {
    this.tracking = this.bodies[(this.bodies.indexOf(this.tracking) + this.bodies.length + i) % this.bodies.length]
  }

  klass.prototype.setBodies = function(bodies) {
    this.bodies = bodies
  }

  klass.prototype.getBodies = function() {
    return this.bodies
  }

  klass.prototype.run = function(renderer) {
    this.running = true
    var last_run = new Date(), now

    for (var i = this.bodies.length; i--; ) {
      this.bodies[i].setTime(this.t)
    }

    (function render() {
      now = new Date()
      this.stepBodies()
      focusOnBody(renderer, this.tracking)
      this.launchVehicles()
      this.performManeuvers()
      this.debug()
      this.tick()

      if (now - last_run > 14) {
        renderer.clear()
        for (var i = this.bodies.length; i--; ) {
          this.bodies[i].renderBreadcrumbs(renderer)
        }

        for (var i = this.bodies.length; i--; ) {
          this.bodies[i].render(renderer)
        }
        this.showSimDetails(renderer)
      }
      last_run = now
      window.requestAnimationFrame(render.bind(this))
    }.bind(this))()
  }

  klass.prototype.stepBodies = function() {
    if (!this.running) return

    for (var i = this.bodies.length; i--; ) {
      this.bodies[i].step(this.tick_size)
    }
  }

  function focusOnBody(renderer, body) {
    if (!body) return

    renderer.offset = body.getCoordinates()
  }

  klass.prototype.registerLaunch = function(launch) {
    this.launches.push(launch)
  }

  klass.prototype.launchVehicles = function() {
    if (!this.running) return

    for (var i = 0; i < this.launches.length; i++) {
      var launch = this.launches[i]
      if (launch.ready(this.t)) {
        this.bodies.push(launch.activate(this.t))
      }
    }
  }

  klass.prototype.performManeuvers = function() {
    if (!this.running) return

    for (var i = this.bodies.length; i--; ) {
      this.bodies[i].runManeuvers(this.t)
    }
  }

  klass.prototype.debug = function() {
    if (!this.debugger) return

    this.debugger.debug(this)
  }

  klass.prototype.tick = function() {
    if (!this.running) return
    this.t = this.t.plus(this.tick_size)
  }

  klass.prototype.registerShipLaunch = function(launch_data) {
    this.launches.push(launch_data)
    this.launches = this.launches.sort()
  }

  klass.prototype.faster = function() {
    if (this.tick_size < 1000000) {
      this.tick_size *= 10
    }
  }

  klass.prototype.slower = function() {
    if (this.tick_size > 1) {
      this.tick_size *= 0.1
    }
  }

  klass.prototype.togglePaused = function(renderer) {
    if (this.running) {
      this.pause()
    } else {
      this.run(renderer)
    }
  }

  klass.prototype.pause = function() {
    this.running = false
  }

  klass.prototype.showSimDetails = function(renderer) {
    renderer.print('Zoom: ' + renderer.zoom, 5, 10)
    renderer.print('Warp: ' + this.tick_size, 5, 20)
    renderer.print(this.getKerbalDate(), 5, 30)
    renderer.print('T+' + this.t, 5, 40)
  }

  klass.prototype.getKerbalDate = function() {
    return window.Helper.convertTimeToDate(this.t)
  }

  return klass
})()

window.FlightPlan = (function() {
  var klass = function FlightPlan(ship_name, timestamp) {
    this.ship_name = ship_name
    this.timestamp = timestamp
    this.maneuvers = []
  }

  klass.prototype.ready = function(t) {
    return t < this.timestamp
  }

  klass.prototype.scheduleLaunchFromPlanet = function(planet, soi_body, heading, launch_data) {
    this.initShip()
    this.activate = function(t) {
      this.ship.setParent(this.soi_body)
      this.ship.setVelocity(this.planet.getVelocity())
      this.ship.setPositionUsingPosition(this.planet.pos)
      this.ship.setPrograde(this.planet.getPrograde())
      this.ship.setHeading(this.heading)
      this.ship.setMaxAcceleration(this.launch_data.max_accel)
      this.ship.setThrottle(this.launch_data.throttle)
      this.ship.setTime(t)
      if (this.launch_data.target) this.ship.setTarget(this.launch_data.target)

      return this.ship
    }.bind({ ship: this.ship, planet: planet, soi_body: soi_body, heading: heading, launch_data: launch_data})

    return this
  }

  klass.prototype.placeShip = function(parent_body, velocity, pos, prograde, heading, launch_data) {
    this.initShip()
    this.activate = function() {
      this.ship.setMaxAcceleration(launch_data.max_accel)
      this.ship.setThrottle(launch_data.throttle)
      if (launch_data.target) this.ship.setTarget(launch_data.target)
    }.bind(this)

    return this
  }

  klass.prototype.initShip = function() {
    this.ship = new window.Ship(this.ship_name, null, 50, 0, { r: 0, phi: 0 }, 0, 0)
    this.ship.registerFlightPlan(this)
  }

  klass.prototype.addManeuver = function(condition, heading, throttle) {
    var man = new window.Maneuver(this.ship, condition, heading, throttle)
    this.maneuvers.push(man)
    return man.getDeferred()
  }

  klass.prototype.activateManeuvers = function(t) {
    for (var i = this.maneuvers.length; i--; ) {
      if (this.maneuvers[i].activate(t)) {
        this.maneuvers.splice(i, 1)
      }
    }
  }

  klass.prototype.addObserver = function(observer) {
    this.ship.addObserver(observer)
  }

  return klass
})()

window.Maneuver = (function($) {
  var klass = function Maneuver(ship, condition, heading, throttle) {
    this.ship        = ship
    this.condition   = condition
    this.heading     = heading
    this.throttle    = throttle
    this.deferred    = $.Deferred()
  }

  klass.prototype.activate = function(t) {
    if (!this.ready(t, this.ship)) return false

    this.ship.setHeading(this.heading)
    this.ship.setThrottle(this.throttle)
    this.alertCourseChange(t)
    return true
  }

  klass.prototype.ready = function(t) {
    return this.condition(t, this.ship)
  }

  klass.prototype.alertCourseChange = function(t) {
    this.getDeferred().resolve(this.ship.getObservers())
  }

  klass.prototype.getDeferred = function() {
    return this.deferred
  }

  return klass
})(jQuery)

window.Helper = {
  isBlank: function (x) {
    return (x === null || typeof(x) === 'undefined')
  },
  shadeRGBColor: function(color, percent) {
    // from http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
    var f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF
    return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1)
  },
  convertTimeToDate: function(t) {
    var year   = Math.floor(t / YEAR) + 1,
        day    = Math.floor((t % YEAR) / DAY) + 1,
        hour   = Math.floor(((t % YEAR) % DAY) / HOUR),
        minute = Math.floor((((t % YEAR) % DAY) % HOUR) / MIN)
    if (day < 100) {
      if (day < 10) day = '0' + '' + day
      day = '0' + '' + day
    }
    if (minute < 10) minute = '0' + '' + minute
    return 'Year ' + year + ', Day ' + day + ' ' + hour + ':' + minute
  }
}

window.Debugger = (function($) {
  var klass = function Debugger(body_name) {
    this.name = body_name
  }

  klass.prototype.debug = function(sim) {
    for (var i = sim.bodies.length; i--; ) {
      var body = sim.bodies[i]
      if (this.name === body.name) {
        debugData(body.pos.r,   'r')
        debugData(body.pos.phi.times(180).dividedBy('' + Math.PI), 'phi')
        debugData(body.v,       'vel')
        debugData(body.getPrograde().times(180).dividedBy('' + Math.PI), 'prograde')
        debugData(body.getHeading().times(180).dividedBy('' + Math.PI), 'heading')
        var kd = window.CelestialObject.calcObjectDistance(kerbin, body),
            dd = window.CelestialObject.calcObjectDistance(duna, body)
        debugData(kd, 'kdist')
        debugData(dd, 'ddist')
      }
    }
  }


  function debugData(data, id) {
    var el = document.getElementById(id)
    if (el) { el.innerHTML = data }
  }

  return klass
})(jQuery)
