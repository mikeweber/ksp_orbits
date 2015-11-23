/* global FlightPlanner */
(function(namespace) {
  'use strict'

  namespace.FlightPlan = (function() {
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
      this.ship = new namespace.Ship(this.ship_name, null, 50, 0, { r: 0, phi: 0 }, 0, 0)
      this.ship.registerFlightPlan(this)
    }

    klass.prototype.addManeuver = function(condition, heading, absolute, throttle) {
      var man = new namespace.Maneuver(this.ship, condition, heading, absolute, throttle)
      this.maneuvers.push(man)
      return man.getDeferred()
    }

    klass.prototype.addSOIChangeManeuver = function(body, heading, absolute, throttle) {
      var man = new namespace.Maneuver(this.ship, function() { return true }, heading, absolute, throttle)
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
})(FlightPlanner.Model)
