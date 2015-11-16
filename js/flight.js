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
    if (this.parent) this.parent.registerChildBody(this)
    this.radius   = new Decimal(radius)
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
    this.trail_length     = 75
    this.breadcrumbs      = []
    this.bodies_in_soi    = []
    this.soi_observers    = []
  }

  klass.prototype.registerChildBody = function(body) {
    this.bodies_in_soi.push(body)
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

  klass.prototype.step = function(dt, t) {
    var one = new Decimal(1),
        two = new Decimal(2),
        n   = this.mu.plus(this.parent.mu).dividedBy(this.a.toPower(3)).sqrt(),
        M   = n.times(t).plus(this.m),
        e   = this.e,
        S   = new Decimal('' + Math.sin(-M)),
        C   = new Decimal('' + Math.cos(-M)),
        phi = new Decimal('' + Math.atan2(one.minus(e.toPower(2)).times(S), C.minus(e))),
        v   = M.plus(two.times(e).times('' + Math.sin(M))).plus(new Decimal(1.25).times(e.toPower(2)).times(two.times(M))),
        r   = this.a.times(one.minus(e.toPower(2)).dividedBy(one.plus(e.times('' + Math.cos(v)))))
    this.pos = { 'r': r, phi: phi }
    this.dropBreadcrumb(t)
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
    var ctx           = renderer.context,
        world_coords  = this.getCoordinates(),
        coords        = renderer.convertWorldToCanvas(world_coords),
        planet_radius = this.getRadiusForRendering(renderer),
        soi_radius    = this.getSOIRadiusForRendering(renderer)

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

  klass.prototype.getSOIRadiusForRendering = function(renderer) {
    if (!this.soi) return 0
    return renderer.scaleWorldToCanvasX(this.soi)
  }

  klass.prototype.dropBreadcrumb = function(t) {
    if (t - this.last_breadcrumb < this.breadcrumb_delta) return

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

  klass.prototype.getRadiusForRendering = function(renderer) {
    return Math.max(renderer.scaleWorldToCanvasX(this.radius), 4)
  }

  klass.prototype.getRadius = function() {
    return this.radius
  }

  klass.prototype.getVelocity = function() {
    return this.v
  }

  klass.prototype.getMissionTime = function(t) {
    return t.minus(this.launch_time)
  }

  klass.prototype.registerFlightPlan = function() {}

  klass.prototype.registerSOIChangeObserver = function(observer) {
    this.soi_observers.push(observer)
  }

  klass.prototype.runManeuvers = function(t) {
    if (this.plan) {
      this.plan.activateManeuvers(t)
    }
  }

  klass.prototype.getParent = function() {
    return this.parent
  }

  klass.prototype.getBodiesInSOI = function() {
    return this.bodies_in_soi
  }

  return klass
})()

window.Planet = (function() {
  'use strict'

  var klass = function Planet(name, parent, radius, color, mu, v, semimajor_axis, pos, e, prograde, soi) {
    this.initializeParameters(name, parent, radius, color, mu, v, semimajor_axis, pos, e, prograde)
    this.soi          = new Decimal(soi)
    this.innerbb      = this.soi.toPower(2).dividedBy(2).sqrt()
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

  klass.prototype.isInSOI = function(ship) {
    var ship_coords = ship.getCoordinates(),
        planet_coords = this.getCoordinates(),
        dist_x = ship_coords.x.minus(planet_coords.x).abs(),
        dist_y = ship_coords.y.minus(planet_coords.y).abs()
    // Optimized detection;
    // SOI intersection not possible when dist in x or y axis is larger than the radius
    if (dist_x.gt(this.soi) || dist_y.gt(this.soi)) return false
    // If the ship is within the inner bounding box (the largest square that can fit in the SOI),
    // then it is definitely within the SOI
    if (dist_x.lt(this.innerbb) && dist_y.lt(this.innerbb)) return true
    // Finally fall through and check the edge case by looking at the distance between the ships
    return window.CelestialObject.calcCoordDistance(planet_coords, ship_coords).lessThan(this.soi)
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
  klass.prototype.dropBreadcrumb = function() {}
  klass.prototype.renderBreadcrumbs = function() {}
  klass.prototype.getOrbitalPeriod = function() {}
  klass.prototype.isInSOI = function() { return true }
  klass.prototype.getParent = function() { return this }

  return klass
})()

window.Ship = (function() {
  'use strict'

  var klass = function Ship(  name, parent, radius,               v,    pos,    prograde, heading, absolute_heading) {
    this.initializeParameters(name, parent, radius, '#FFFFFF', 0, v, 0, pos, 0, prograde)
    this.setHeading(heading, absolute_heading)
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

  klass.prototype.getTarget = function() {
    return this.target
  }

  klass.prototype.step = function(dt, t) {
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
    this.dropBreadcrumb(t)
    this.updateObservers(t)
    this.detectSOIChange(t)
  }

  klass.prototype.setMaxAcceleration = function(accel) {
    this.max_accel = new Decimal(accel)
  }

  klass.prototype.setThrottle = function(throttle) {
    if (window.Helper.isBlank(throttle)) return

    if (throttle < 0) throttle = 0
    if (throttle > 1) throttle = 1
    this.throttle = throttle
    this.accel = this.max_accel.times(this.throttle)
  }

  klass.prototype.getThrottle = function() {
    return this.throttle
  }

  klass.prototype.setPosition = function(coords) {
    var distance = coords.x.toPower(2).plus(coords.y.toPower(2)).sqrt(),
        phi      = new Decimal('' + Math.atan2(coords.y, coords.x))

    this.pos = { 'r': distance, phi: phi }
  }

  klass.prototype.setPositionUsingPosition = function(pos) {
    this.pos = { 'r': new Decimal(pos.r), phi: new Decimal('' + pos.phi) }
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

  klass.prototype.setHeading = function(heading, use_absolute) {
    if (window.Helper.isBlank(heading)) return

    this.use_absolute_heading = use_absolute
    this.heading = new Decimal('' + heading)
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
    if (this.use_absolute_heading) {
      return this.heading
    } else {
      return this.getPrograde().plus(this.heading)
    }
  }

  klass.prototype.getRadiusForRendering = function() {
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

  klass.prototype.detectSOIChange = function(t) {
    if (this.just_checked_soi) {
      this.just_checked_soi = false
    }
    if (this.parent.isInSOI(this)) {
      var bodies = this.parent.getBodiesInSOI()
      for (var i = bodies.length; i--; ) {
        if (bodies[i].isInSOI(this)) {
          var new_parent = bodies[i],
              old_coords = this.getLocalCoordinates(),
              p_coords   = new_parent.getLocalCoordinates(),
              new_coords = { x: old_coords.x.minus(p_coords.x), y: old_coords.y.minus(p_coords.y) },
              p_vel      = new_parent.getVelocity(),
              s_vel      = this.getVelocity(),
              p_pro      = new_parent.getPrograde(),
              s_pro      = this.getPrograde(),
              p_vel_x    = p_vel.times('' + Math.cos(p_pro)),
              p_vel_y    = p_vel.times('' + Math.sin(p_pro)),
              s_vel_x    = s_vel.times('' + Math.cos(s_pro)),
              s_vel_y    = s_vel.times('' + Math.sin(s_pro)),
              vel_x      = s_vel_x.minus(p_vel_x),
              vel_y      = s_vel_y.minus(p_vel_y)

          this.parent = new_parent
          this.setPosition(new_coords)
          this.alterPrograde(vel_x, vel_y)
          this.alterVelocity(vel_x, vel_y)
          this.just_checked_soi = true
          this.alertSOIChange(this.parent, t)
          return true
        }
      }
      return false
    } else {
      switchSOI(this, this.parent.getParent())
      this.just_checked_soi = true
      this.alertSOIChange(this.parent, t)
      return true
    }
  }

  function switchSOI(ship, new_parent) {
    var old_coords = ship.getLocalCoordinates(),
        p_coords   = ship.parent.getLocalCoordinates(),
        new_coords = { x: p_coords.x.plus(old_coords.x), y: p_coords.y.plus(old_coords.y) },
        old_parent = ship.parent,
        p_vel      = old_parent.getVelocity(),
        s_vel      = ship.getVelocity(),
        p_pro      = old_parent.getPrograde(),
        s_pro      = ship.getPrograde(),
        p_vel_x    = p_vel.times('' + Math.cos(p_pro)),
        p_vel_y    = p_vel.times('' + Math.sin(p_pro)),
        s_vel_x    = s_vel.times('' + Math.cos(s_pro)),
        s_vel_y    = s_vel.times('' + Math.sin(s_pro)),
        vel_x      = p_vel_x.plus(s_vel_x),
        vel_y      = p_vel_y.plus(s_vel_y)

    ship.parent = new_parent
    ship.setPosition(new_coords)
    ship.alterPrograde(vel_x, vel_y)
    ship.alterVelocity(vel_x, vel_y)
  }

  klass.prototype.alertSOIChange = function(new_parent, t) {
    for (var i = this.soi_observers.length; i--; ) {
      if (this.soi_observers[i](new_parent, t)) this.soi_observers.splice(i, 1)
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
    this.offset       = { x: new Decimal(0), y: new Decimal(0) }
    this.zoom         = new Decimal(1)
    this.initCanvas(canvas)
  }

  klass.prototype.zoomOut = function() {
    this.zoomTo(this.zoom.minus(this.getZoomFactor()))
    if (this.zoom.lt(1)) this.zoom = new Decimal(1)
  }

  klass.prototype.zoomIn = function() {
    this.zoomTo(this.zoom.plus(this.getZoomFactor()))
    if (this.zoom.gt(35000)) this.zoom = new Decimal(35000)
  }

  klass.prototype.getZoomFactor = function() {
    return this.zoom.times(0.1)
  }

  klass.prototype.zoomTo = function(zoom) {
    this.zoom = new Decimal(zoom)
  }

  klass.prototype.getOffset = function() {
    return this.offset
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

    (function render() {
      now = new Date()
      this.stepBodies()
      focusOnBody(renderer, this.tracking)
      this.launchVehicles()
      this.performManeuvers()
      this.debug()
      this.tick()

      var crumbs = 0
      if (now - last_run > 14) {
        renderer.clear()
        for (var i = this.bodies.length; i--; ) {
          crumbs += this.bodies[i].renderBreadcrumbs(renderer)
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
      this.bodies[i].step(this.tick_size, this.t)
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
        this.launches.splice(i, 1)
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
    this.running = !this.running
  }

  klass.prototype.showSimDetails = function(renderer) {
    renderer.print('Zoom: ' + renderer.zoom.round(), 5, 10)
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
    this.observers = []
  }

  klass.prototype.ready = function(t) {
    return this.timestamp < t
  }

  klass.prototype.scheduleLaunchFromPlanet = function(planet, initial_altitude, launch_data) {
    this.initShip()
    this.activate = function(t) {
      this.ship.setParent(planet)
      var alt          = planet.getRadius().plus(initial_altitude * 1000),
          v            = planet.mu.times(new Decimal(1).dividedBy(alt)).sqrt(),
          init_heading = new Decimal('' + (launch_data.initial_angle - Math.PI * 0.5))
      this.ship.setVelocity(v)
      this.ship.setPositionUsingPosition({ r: alt, phi: launch_data.initial_angle })
      this.ship.setPrograde(init_heading)
      this.ship.setHeading(launch_data.heading, launch_data.absolute_heading)
      this.ship.setMaxAcceleration(launch_data.max_accel)
      this.ship.setThrottle(launch_data.throttle)
      this.ship.setTime(t)
      this.initObservers()
      if (launch_data.target) this.ship.setTarget(launch_data.target)

      return this.ship
    }.bind(this)

    return this
  }

  klass.prototype.placeShip = function(parent_body, velocity, pos, prograde, heading, launch_data) {
    this.initShip()
    this.activate = function() {
      this.ship.setMaxAcceleration(launch_data.max_accel)
      this.ship.setThrottle(launch_data.throttle)
      this.initObservers()
      if (launch_data.target) this.ship.setTarget(launch_data.target)
    }.bind(this)

    return this
  }

  klass.prototype.initShip = function() {
    this.ship = new window.Ship(this.ship_name, null, 50, 0, { r: 0, phi: 0 }, 0, 0)
    this.ship.registerFlightPlan(this)
  }

  klass.prototype.addManeuver = function(condition, heading, absolute, throttle) {
    var man = new window.Maneuver(this.ship, condition, heading, absolute, throttle)
    this.maneuvers.push(man)
    return man.getDeferred()
  }

  klass.prototype.addSOIChangeManeuver = function(body, heading, absolute, throttle) {
    var man = new window.Maneuver(this.ship, function() { return true }, heading, absolute, throttle)
    this.ship.registerSOIChangeObserver(function(new_body, t) {
      if (new_body !== body) return false

      man.activate(t)
      return true
    })
    return man.getDeferred()
  }

  klass.prototype.activateManeuvers = function(t) {
    for (var i = this.maneuvers.length; i--; ) {
      if (this.maneuvers[i].activate(t)) {
        this.maneuvers.splice(i, 1)
      }
    }
  }

  klass.prototype.initObservers = function() {
    for (var i = this.observers.length; i--; ) {
      this.ship.addObserver(this.observers[i])
    }
  }

  klass.prototype.addObserver = function(observer) {
    this.observers.push(observer)
  }

  return klass
})()

window.Maneuver = (function($) {
  var klass = function Maneuver(ship, condition, heading, absolute_heading, throttle) {
    this.ship        = ship
    this.condition   = condition
    this.heading     = heading
    this.absolute    = absolute_heading
    this.throttle    = throttle
    this.deferred    = $.Deferred()
  }

  klass.prototype.activate = function(t) {
    if (!this.ready(t, this.ship)) return false

    this.ship.setHeading(this.heading, this.absolute)
    this.ship.setThrottle(this.throttle)
    this.alertCourseChange(t)
    return true
  }

  klass.prototype.ready = function(t) {
    return this.condition(t, this.ship)
  }

  klass.prototype.alertCourseChange = function(t) {
    this.getDeferred().resolve(this.ship.getObservers(), this.ship, t)
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
  },
  radianToDegrees: function(rad) {
    return rad.times(180).dividedBy('' + Math.PI)
  },
  roundTo: function(num, dec) {
    if (!num) return
    var factor = new Decimal(10).toPower(dec)
    return num.times(factor).round().dividedBy(factor)
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
