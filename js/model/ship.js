/* global FlightPlanner Decimal Object jQuery */

(function(namespace, helpers, makeObservable, calculators) {
  'use strict'

  namespace.Ship = (function() {
    var klass = function Ship(  name, radius,               v,    pos,    prograde, heading, absolute_heading) {
      this.setMotionCalculator(calculators.acceleration)
      this.initializeParameters(name, radius, 0, v, 0, pos, 0, prograde)
      this.setHeading(heading, absolute_heading)
      this.breadcrumb_delta  = DAY
      this.nearest_approach  = null
      this.max_accel         = new Decimal(0)
      this.trail_length      = 200
    }

    klass.prototype = Object.create(namespace.CelestialBody.prototype)
    klass.prototype.constructor = klass

    klass.prototype.hasShadow = function() { return false }

    klass.prototype.setTarget = function(target) {
      this.target = target
    }

    klass.prototype.getTarget = function() {
      return this.target
    }

    klass.prototype.renderName = function() {}

    klass.prototype.step = function(t, dt) {
      var gravity     = this.parent.mu.plus(this.mu).dividedBy(this.pos.r.toPower(2)).times(-1),
          g_x         = gravity.times(this.getGravityWellX()),
          g_y         = gravity.times(this.getGravityWellY()),
          a_x         = this.getAcceleration().times(this.getHeadingX()),
          a_y         = this.getAcceleration().times(this.getHeadingY()),
          accel_x     = a_x.plus(g_x).times(dt),
          accel_y     = a_y.plus(g_y).times(dt),
          vel_x       = this.v.times(this.getProgradeX(t)),
          vel_y       = this.v.times(this.getProgradeY(t)),
          old_coords  = this.getLocalCoordinates(),
          mid_x       = old_coords.x.plus(vel_x.times(dt).plus(accel_x.times(dt).dividedBy(2))),
          mid_y       = old_coords.y.plus(vel_y.times(dt).plus(accel_y.times(dt).dividedBy(2))),
          mid_coords  = { x: mid_x, y: mid_y },
          mid_phi     = new Decimal(Math.atan2(mid_coords.y, mid_coords.x)),
          new_g_x     = gravity.times(Math.cos(mid_phi)),
          new_g_y     = gravity.times(Math.sin(mid_phi)),
          new_accel_x = a_x.plus(new_g_x).times(dt),
          new_accel_y = a_y.plus(new_g_y).times(dt),
          new_x       = old_coords.x.plus(vel_x.times(dt).plus(new_accel_x.times(dt).dividedBy(2))).plus(mid_x).dividedBy(2),
          new_y       = old_coords.y.plus(vel_y.times(dt).plus(new_accel_y.times(dt).dividedBy(2))).plus(mid_y).dividedBy(2),
          new_coords  = { x: new_x, y: new_y }

      this.alterVelocity(vel_x.plus(accel_x), vel_y.plus(accel_y))
      this.alterPrograde(vel_x.plus(accel_x), vel_y.plus(accel_y))
      this.setPosition(new_coords)
      this.dropBreadcrumb(t)
      this.detectSOIChange(t)
      this.detectCollision(t)
    }

    klass.prototype.getAcceleration = function() {
      return this.max_accel.times(this.getThrottle())
    }

    klass.prototype.setMaxAcceleration = function(accel) {
      this.max_accel = new Decimal(accel)
    }

    klass.prototype.setThrottle = function(throttle) {
      if (helpers.isBlank(throttle)) return

      var prevThrottle = this.throttle
      if (throttle < 0) throttle = 0
      if (throttle > 1) throttle = 1
      if (prevThrottle !== throttle) {
        if (throttle === 0) {
          this.useMomentumCalculator(this.t)
        } else {
          this.useAcceleratingCalculator(this.t)
        }
      }
      this.throttle = throttle
    }

    klass.prototype.getThrottle = function() {
      return this.throttle
    }

    klass.prototype.useMomentumCalculator = function(t) {
      this.a = this.getSemiMajorAxis()
      this.e = this.getEccentricity()
      this.m = this.getMeanAnomaly().minus(this.getMeanMotion().times(t))
      this.setMotionCalculator(calculators.momentum)
    }

    klass.prototype.useAcceleratingCalculator = function(t) {
      this.prograde = this.getPrograde(t)
      this.v        = this.getVelocity(t)
      this.setMotionCalculator(calculators.acceleration)
    }

    klass.prototype.setPosition = function(coords) {
      var distance = coords.x.toPower(2).plus(coords.y.toPower(2)).sqrt(),
          phi      = new Decimal(Math.atan2(coords.y, coords.x))

      this.pos = { 'r': distance, phi: phi }
    }

    klass.prototype.setPositionUsingPosition = function(pos) {
      this.pos = { 'r': new Decimal(pos.r), phi: new Decimal(pos.phi) }
    }

    klass.prototype.setParent = function(parent) {
      this.parent = parent
    }

    klass.prototype.setVelocity = function(vel) {
      this.v = new Decimal(vel)
    }

    klass.prototype.setPostion = function(pos) {
      this.pos = pos
    }

    klass.prototype.setPrograde = function(prograde) {
      this.prograde = new Decimal(prograde)
    }

    klass.prototype.setHeading = function(heading, use_absolute) {
      if (helpers.isBlank(heading)) return

      this.use_absolute_heading = use_absolute
      this.heading = new Decimal(heading)
    }

    klass.prototype.alterVelocity = function(vel_x, vel_y) {
      this.v = vel_x.toPower(2).plus(vel_y.toPower(2)).sqrt()
    }

    klass.prototype.alterPrograde = function(vel_x, vel_y) {
      this.prograde = new Decimal(Math.atan2(vel_y, vel_x))
    }

    klass.prototype.getCoordinates = function() {
      var parent = this.parent.getCoordinates(),
          pos    = helpers.posToCoordinates(this.pos)
      return { x: pos.x.plus(parent.x), y: pos.y.plus(parent.y) }
    }

    klass.prototype.getRadiusForRendering = function() {
      return 2
    }

    klass.prototype.detectSOIChange = function(t) {
      if (this.just_checked_soi) this.just_checked_soi = false

      var new_parent, fn
      if (this.parent.isInSOI(this)) {
        var bodies = this.parent.getBodiesInSOI()
        for (var i = bodies.length; i--; ) {
          if (bodies[i].isInSOI(this)) {
            fn = switchToChildSOI
            new_parent = bodies[i]
            i = 1
          }
        }
      } else {
        fn = switchToParentSOI
        new_parent = this.parent.getParent()
      }
      if (!new_parent) return false

      this.notifyObservers('before:soiChange', this, new_parent, t)
      fn(this, new_parent, t)
      this.notifyObservers('after:soiChange', this, new_parent, t)
      return true
    }

    function switchToChildSOI(ship, new_parent, t) {
      var old_coords = ship.getLocalCoordinates(),
          p_coords   = new_parent.getLocalCoordinates(),
          new_coords = { x: old_coords.x.minus(p_coords.x), y: old_coords.y.minus(p_coords.y) },
          p_vel      = new_parent.getVelocity(t),
          s_vel      = ship.getVelocity(t),
          p_pro      = new_parent.getPrograde(t),
          s_pro      = ship.getPrograde(t),
          p_vel_x    = p_vel.times(Math.cos(p_pro)),
          p_vel_y    = p_vel.times(Math.sin(p_pro)),
          s_vel_x    = s_vel.times(Math.cos(s_pro)),
          s_vel_y    = s_vel.times(Math.sin(s_pro)),
          vel_x      = s_vel_x.minus(p_vel_x),
          vel_y      = s_vel_y.minus(p_vel_y)

      ship.parent = new_parent
      ship.setPosition(new_coords)
      ship.alterPrograde(vel_x, vel_y)
      ship.alterVelocity(vel_x, vel_y)
      ship.e = getEccentricity(ship, ship.v, ship.prograde.minus(ship.pos.phi))
    }

    function switchToParentSOI(ship, new_parent, t) {
      var old_coords = ship.getLocalCoordinates(),
          p_coords   = ship.parent.getLocalCoordinates(),
          new_coords = { x: p_coords.x.plus(old_coords.x), y: p_coords.y.plus(old_coords.y) },
          old_parent = ship.parent,
          p_vel      = old_parent.getVelocity(t),
          s_vel      = ship.getVelocity(t),
          p_pro      = old_parent.getPrograde(t),
          s_pro      = ship.getPrograde(t),
          p_vel_x    = p_vel.times(Math.cos(p_pro)),
          p_vel_y    = p_vel.times(Math.sin(p_pro)),
          s_vel_x    = s_vel.times(Math.cos(s_pro)),
          s_vel_y    = s_vel.times(Math.sin(s_pro)),
          vel_x      = p_vel_x.plus(s_vel_x),
          vel_y      = p_vel_y.plus(s_vel_y)

      ship.parent = new_parent
      ship.setPosition(new_coords)
      ship.alterPrograde(vel_x, vel_y)
      ship.alterVelocity(vel_x, vel_y)
      ship.e = getEccentricity(ship, ship.v, ship.prograde.minus(ship.pos.phi))
    }

    function getEccentricity(ship, v, zenith) {
      // Equation 4.30 from http://www.braeunig.us/space/orbmech.htm
      var p1  = ship.pos.r.times(v.toPower(2)).dividedBy(ship.parent.mu).minus(1).toPower(2),
          p2  = new Decimal(Math.sin(zenith)).toPower(2),
          p3  = new Decimal(Math.cos(zenith)).toPower(2)

      return p1.times(p2).plus(p3).sqrt()
    }

    klass.prototype.alertSOIChange = function(new_parent, t) {
      for (var i = this.soi_observers.length; i--; ) {
        if (this.soi_observers[i](new_parent, t)) this.soi_observers.splice(i, 1)
      }
    }

    klass.prototype.detectCollision = function() {
      if (this.parent.isColliding(this)) {
        this.notifyObservers('after:collision')
      }
    }

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.Helper, FlightPlanner.Helper.makeObservable, { momentum: FlightPlanner.Model.MomentumBody, acceleration: FlightPlanner.Model.AcceleratingBody })
