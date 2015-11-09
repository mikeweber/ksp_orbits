window.CelestialObject = (function() {
  var klass = function CelestialObject() {}

  klass.prototype.initializeParameters = function(parent, radius, color, mu, v, semimajor_axis, pos, e, prograde) {
    this.parent   = parent
    this.radius   = radius
    this.color    = color
    this.mu       = new Decimal(mu)
    this.v        = new Decimal(v)
    this.a        = new Decimal(semimajor_axis)
    this.pos      = { r: new Decimal(pos.r), phi: new Decimal('' + pos.phi) }
    this.m        = this.pos.phi
    this.e        = new Decimal(e)
    this.prograde = new Decimal('' + prograde)
    this.last_breadcrumb  = this.t
    this.breadcrumb_delta = 201600
    this.breadcrumbs = []
  }

  klass.calcObjectDistance = function(obj1, obj2) {
    var coord1 = obj1.getCoordinates(),
        coord2 = obj2.getCoordinates()
        return coord1.x.minus(coord2.x).toPower(2).plus(coord1.y.minus(coord2.y).toPower(2)).sqrt()
  }

  klass.prototype.setTime = function(t) {
    this.t = new Decimal(t)
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
    this.pos = { r: r, phi: phi }
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
        coords       = renderer.convertWorldToCanvas(world_coords)
    ctx.beginPath()
    ctx.arc(coords.x, coords.y, this.getRadius(renderer), 0, 2 * Math.PI)
    ctx.fillStyle = this.color
    ctx.fill()
  }

  klass.prototype.dropBreadcrumb = function(t) {
    if (t - this.last_breadcrumb < this.breadcrumb_delta) return

    this.breadcrumbs.push({ parent: this.parent, pos: Object.create(this.pos) })
    this.last_breadcrumb = t
    if (this.breadcrumbs.length > 50) this.breadcrumbs.shift()
  }

  klass.prototype.renderBreadcrumbs = function(renderer) {
    var ctx = renderer.context
    for (var i = this.breadcrumbs.length; i--; ) {
      var el     = this.breadcrumbs[i],
          coords = renderer.convertLocalToCanvas(el.parent, el.pos)
      ctx.beginPath()
      ctx.arc(coords.x, coords.y, 1, 0, 2 * Math.PI)
      ctx.fillStyle = this.color
      ctx.fill()
    }
  }

  klass.prototype.getRadius = function(renderer) {
    return Math.max(renderer.scaleWorldToCanvasX(this.radius).times(renderer.zoom), 4)
  }

  klass.prototype.getVelocity = function() {
    return this.v
  }

  return klass
})()

window.Planet = (function() {
  var klass = function Planet(parent, radius, color, mu, v, semimajor_axis, pos, e, prograde) {
    this.initializeParameters(parent, radius, color, mu, v, semimajor_axis, pos, e, prograde)
  }

  klass.prototype = Object.create(CelestialObject.prototype)
  klass.prototype.constructor = klass

  klass.prototype.getPrograde = function() {
    return this.pos.phi.minus('' + Math.PI / 2)
  }

  return klass
})()

window.Sun = (function() {
  var klass = function Sun(mu, radius) {
    this.initializeParameters(null, radius, '#FF0', mu, 0, 0, { r: 0, phi: 0 }, 0, 0)
  }

  klass.prototype = Object.create(CelestialObject.prototype)
  klass.prototype.constructor = klass

  klass.prototype.step = function() {}

  klass.prototype.getParentCoordinates = function() {
    return { x: new Decimal(0), y: new Decimal(0) }
  }
  klass.prototype.dropBreadcrumb = function() {}
  klass.prototype.renderBreadcrumb = function() {}

  return klass
})()

window.Ship = (function() {
  var klass = function   Ship(parent, radius,            v,    pos,    prograde, heading) {
    this.initializeParameters(parent, radius, '#FFF', 0, v, 0, pos, 0, prograde)
    this.setHeading(heading)
    this.breadcrumb_delta = 21600
    this.nearest_approach = null
  }

  klass.prototype = Object.create(CelestialObject.prototype)
  klass.prototype.constructor = klass

  klass.prototype.setManeuvers = function(maneuvers) {
    this.maneuvers = maneuvers
  }

  klass.prototype.setTarget = function(target) {
    this.target = target
  }

  klass.prototype.trackNearestApproach = function(t) {
    if (!this.target) return
    var d = CelestialObject.calcObjectDistance(this, this.target)
    if (this.nearest_approach === null || d < this.nearest_approach) {
      this.nearest_approach = d
    }
  }

  klass.prototype.step = function(dt) {
    this.t = this.t.plus(dt)
    this.alterCourse(this.t)
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
    this.alterVelocity(vel_x.plus(accel_x), vel_y.plus(accel_y), dt)
    this.alterPrograde(vel_x.plus(accel_x), vel_y.plus(accel_y))
    this.setPosition(new_coords)
    this.trackNearestApproach(this.t)
  }

  klass.prototype.alterCourse = function(t) {
    if (this.maneuvers.length === 0) return

    if (t > this.maneuvers[0][0]) {
      var man = this.maneuvers.shift()[1]
      if (man === null) {
        if (this.nearest_approach) {
          alert('Nearest approach: ' + this.nearest_approach.times(0.001).floor() + 'km')
        }
      } else {
        if (!(man.heading === null || typeof man.heading === 'undefined')){
          this.setHeading(man.heading)
        }
        if (!(man.throttle === null || typeof man.throttle === 'undefined')){
          this.setThrottle(man.throttle)
        }
      }
    }
  }

  klass.prototype.setMaxAcceleration = function(accel) {
    this.max_accel = new Decimal(accel)
  }

  klass.prototype.setThrottle = function(throttle) {
    this.accel = this.max_accel.times(throttle)
  }

  klass.prototype.setPosition = function(coords) {
    var distance = coords.x.toPower(2).plus(coords.y.toPower(2)).sqrt(),
        phi      = new Decimal('' + Math.atan2(coords.y, coords.x))

    this.pos = { r: distance, phi: phi }
  }

  klass.prototype.setHeading = function(heading) {
    this.heading = this.getPrograde().plus('' + heading)
  }

  klass.prototype.alterVelocity = function(vel_x, vel_y, dt) {
    this.v = vel_x.toPower(2).plus(vel_y.toPower(2)).sqrt()
  }

  klass.prototype.alterPrograde = function(vel_x, vel_y) {
    this.prograde = new Decimal('' + Math.atan2(vel_y, vel_x))
  }

  klass.prototype.getCoordinates = function() {
    var parent = this.parent.getCoordinates(),
        pos    = CelestialObject.posToCoordinates(this.pos)
    return { x: pos.x.plus(parent.x), y: pos.y.plus(parent.y) }
  }

  klass.prototype.getHeading = function() {
    return this.heading
  }

  klass.prototype.getRadius = function() {
    return 2
  }

  return klass
})()

window.Renderer = (function() {
  var klass = function Renderer(canvas, world_size, canvas_size) {
    this.context     = canvas.getContext('2d')
    this.world_size  = { width: new Decimal(world_size.width),  height: new Decimal(world_size.height) }
    this.canvas_size = { width: new Decimal(canvas_size.width), height: new Decimal(canvas_size.height) }
    this.origin      = { x: this.canvas_size.width / 2, y: this.canvas_size.height / 2 },
    this.offset      = { x: 0, y: 0 },
    this.zoom        = new Decimal(1)
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
    this.context.fillStyle = '#000'
    this.context.fill()
  }

  klass.prototype.convertLocalToCanvas = function(parent, local_pos) {
    var parent_coords = parent.getCoordinates(),
        local_coords  = CelestialObject.posToCoordinates(local_pos)
    return this.convertWorldToCanvas({ x: parent_coords.x.plus(local_coords.x), y: parent_coords.y.plus(local_coords.y) })
  }

  klass.prototype.convertWorldToCanvas = function(coords) {
    return {
      x: this.scaleWorldToCanvasX(coords.x.minus(this.offset.x).times(this.zoom)).plus(this.origin.x),
      y: this.scaleWorldToCanvasY(coords.y.minus(this.offset.y).times(this.zoom)).plus(this.origin.y)
    }
  }

  klass.prototype.scaleWorldToCanvasX = function(point) {
    return new Decimal(point).dividedBy(this.world_size.width).times(this.canvas_size.width / 2)
  }

  klass.prototype.scaleWorldToCanvasY = function(point) {
    return new Decimal(point).dividedBy(this.world_size.height).times(this.canvas_size.height / 2)
  }

  return klass
})()

window.Simulator = (function() {
  var klass = function Simulator(time, elements, tick_size, debug) {
    this.t         = time
    this.elements  = elements
    this.tick_size = tick_size
    this.running   = false
    this.debug     = debug
  }

  klass.prototype.track = function(celestial_object) {
    this.tracking = celestial_object
  }

  klass.prototype.trackNext = function() {
    this.moveTracker(1)
  }

  klass.prototype.trackPrev = function() {
    this.moveTracker(-1)
  }

  klass.prototype.moveTracker = function(i) {
    this.tracking = this.elements[(this.elements.indexOf(this.tracking) + this.elements.length + i) % this.elements.length]
  }

  klass.prototype.run = function(renderer) {
    this.running = true
    var last_run = new Date(), now
    for (var i = this.elements.length; i--; ) {
      this.elements[i].setTime(this.t)
    }
    (function render() {
      now = new Date()
      renderer.clear()
      for (var i = this.elements.length; i--; ) {
        var element = this.elements[i]
        element.step(this.tick_size)
      }
      if (this.tracking) {
        var coords = this.tracking.getCoordinates()
        renderer.offset = { x: coords.x, y: coords.y }
      }

      for (var i = this.elements.length; i--; ) {
        var element = this.elements[i]
        if (this.debug === element.color) {
          debugData(element.pos.r,   'r')
          debugData(element.pos.phi.times(180).dividedBy('' + Math.PI), 'phi')
          debugData(element.v,       'vel')
          debugData(element.getPrograde().times(180).dividedBy('' + Math.PI), 'prograde')
          debugData(element.getHeading().times(180).dividedBy('' + Math.PI), 'heading')
          var kd = CelestialObject.calcObjectDistance(kerbin, element),
              dd = CelestialObject.calcObjectDistance(duna, element)
          debugData(kd, 'kdist')
          debugData(dd, 'ddist')
        }
        element.dropBreadcrumb(this.t)
      }
      this.showSimDetails(renderer)

      if (now - last_run > 0.2) {
        for (var i = this.elements.length; i--; ) {
          this.elements[i].renderBreadcrumbs(renderer)
        }

        for (var i = this.elements.length; i--; ) {
          this.elements[i].render(renderer)
        }
      }
      last_run = now
      this.t += this.tick_size
      if (launches.length > 0 && this.t > launches[0][0]) {
        launch_data = launches.shift()[1]
        var ship = new Ship(sun, 50, kerbin.getVelocity(), kerbin.pos, kerbin.getPrograde(), launch_data.angle)
        ship.setTime(this.t)
        ship.setMaxAcceleration(0.2)
        ship.setThrottle(launch_data.throttle)
        ship.setManeuvers(maneuvers)
        ship.setTarget(duna)
        this.elements.unshift(ship)
      }
      if (this.running) window.requestAnimationFrame(render.bind(this))
    }.bind(this))()
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
      this.running = false
    } else {
      this.run(renderer)
    }
  }

  klass.prototype.showSimDetails = function(renderer) {
    debugData(renderer.zoom, 'zoom')
    debugData(Math.floor(this.t / 21600) + ' -- ' + this.t, 'day')
    debugData(this.tick_size , 'warp')
  }

  function debugData(data, id) {
    var el = document.getElementById(id)
    if (el) el.innerHTML = data
  }

  return klass
})();

var sun       = new Sun(1.1723328e18, 2.616e8),
    kerbin    = new Planet(sun, 6e5,   '#33F', 3.5316e12,    9284.5, 13599840256, { r: 13599840256, phi: -Math.PI }, 0,    Math.PI / 2),
    duna      = new Planet(sun, 3.2e5, '#F33', 3.0136321e11, 7915,   20726155264, { r: 19669121365, phi: -Math.PI }, 0.05, Math.PI / 2),
    launches  = [[1.8872e7, { angle: 0.31 * Math.PI, throttle: 1 }]],
    maneuvers = [[1.907e7, { heading: Math.PI }], [1.92999e7, { throttle: 0 }], [1.93e7, null]]

;(function() {
  var size     = 2.3e10,
      world    = { width: size, height: size },
      canvas   = { width: 500, height: 500 },
      renderer = new Renderer(document.getElementById('flightplan'), world, canvas),
      t        = 1.88719e7,
      s        = new Simulator(t, [sun, duna, kerbin], 1)
  s.track(kerbin)
  renderer.zoomTo(1)
  s.run(renderer)
  document.getElementById('pause').addEventListener('click', function() { s.togglePaused(renderer) })
  document.getElementById('zoom_in').addEventListener('click', renderer.zoomIn.bind(renderer))
  document.getElementById('zoom_out').addEventListener('click', renderer.zoomOut.bind(renderer))
  document.getElementById('faster').addEventListener('click', s.faster.bind(s))
  document.getElementById('slower').addEventListener('click', s.slower.bind(s))
  window.onkeyup = function(e) {
    var key = e.keyCode ? e.keyCode : e.which

    if (key === 27 || key === 32) {
      // esc
      s.togglePaused(renderer)
    } else if (key === 187) {
      // +
      renderer.zoomIn()
    } else if (key === 189) {
      // -
      renderer.zoomOut()
    } else if (key === 190) {
      // >
      s.faster()
    } else if (key === 188) {
      // <
      s.slower()
    } else if (key === 221) {
      // [
      s.trackNext()
    } else if (key === 219) {
      // ]
      s.trackPrev()
    }
  }
})()

