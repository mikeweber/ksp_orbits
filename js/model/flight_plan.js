/* global FlightPlanner */
(function(namespace, makeObservable) {
  'use strict'

  namespace.FlightPlan = (function() {
    var klass = function FlightPlan(player, ship_name, status_tracker, timestamp) {
      this.simulator      = player.sim
      this.renderer       = player.renderer
      this.ship_name      = ship_name
      this.status_tracker = status_tracker
      this.timestamp      = new Decimal(timestamp)
      this.maneuvers      = []
      this.ship_observers = []
    }

    klass.prototype.ready = function(t) {
      return this.timestamp.lt(t)
    }

    klass.prototype.scheduleLaunchFromPlanet = function(planet, initial_altitude, launch_data) {
      this.initShip()
      this.watchForCollision()
      var conditional_activate = function(t) {
        if (this.timestamp.lt(t)) this.blastOff(t)
      }.bind(this)
      this.blastOff = function(t) {
        this.notifyObservers('before:blastOff', this.ship, t)
        this.ship.setParent(planet)
        var alt          = planet.getRadius().plus(initial_altitude * 1000),
            v            = planet.mu.times(new Decimal(1).dividedBy(alt)).sqrt(),
            init_heading = new Decimal(launch_data.initial_angle + Math.PI * 0.5)
        if (launch_data.clockwise_orbit) v = v.times(-1)
        this.ship.setVelocity(v)
        this.ship.setPositionUsingPosition({ r: alt, phi: launch_data.initial_angle })
        this.ship.setCartesianPrograde(init_heading)
        this.ship.setHeading(launch_data.heading, launch_data.absolute_heading)
        this.ship.setMaxAcceleration(launch_data.max_accel)
        this.ship.setFuelConsumption(launch_data.fuel_consumption)
        this.ship.setThrottle(launch_data.throttle, t)
        this.ship.setTarget(launch_data.target)
        this.ship.setTime(t)
        this.initObservers()
        this.simulator.addBody(this.ship)

        this.simulator.unobserve('before:stepBodies', conditional_activate)
        this.notifyObservers('after:blastOff', this.ship, t)
        if (!launch_data.skip_tracking) this.focusOnShip()

        return this.ship
      }.bind(this)

      this.simulator.observe('before:stepBodies', conditional_activate)

      return this
    }

    klass.prototype.placeShip = function(parent_body, velocity, pos, prograde, launch_data) {
      this.initShip()
      this.watchForCollision()
      var conditional_activate = function(t) {
        if (this.timestamp.lt(t)) this.blastOff(t)
      }.bind(this)
      this.blastOff = function(t) {
        this.notifyObservers('before:blastOff', this.ship, t)
        this.ship.setParent(parent_body)
        this.ship.setVelocity(velocity)
        this.ship.setPositionUsingPosition(pos)
        this.ship.setCartesianPrograde(prograde)
        this.ship.setHeading(launch_data.heading, launch_data.absolute_heading)
        this.ship.setMaxAcceleration(launch_data.max_accel)
        this.ship.setFuelConsumption(launch_data.fuel_consumption)
        this.ship.setThrottle(launch_data.throttle, t)
        this.ship.setTarget(launch_data.target)
        this.ship.setTime(t)
        if (launch_data.mission_time) {
          this.ship.setLaunchTime(t.minus(launch_data.mission_time))
        }

        this.initObservers()
        this.simulator.addBody(this.ship)

        this.simulator.unobserve('before:stepBodies', conditional_activate)
        this.notifyObservers('after:blastOff', this.ship, t)
        if (!launch_data.skip_tracking) this.focusOnShip()
      }.bind(this)

      this.simulator.observe('before:stepBodies', conditional_activate)

      return this
    }

    klass.prototype.initShip = function() {
      if (typeof this.ship_name === 'string') {
        this.ship = new namespace.Ship(this.ship_name, 50, 0, { r: 0, phi: 0 }, 0, 0)
      } else {
        this.ship = this.ship_name
      }
      this.ship.observe('after:step', function(t) {
        executeManeuvers(this.maneuvers, t)
        this.status_tracker.updateStatus.bind(this.status_tracker)(t, this.ship)
      }.bind(this))
    }

    klass.prototype.watchForCollision = function() {
      this.ship.observe('after:collision', function() {
        this.simulator.togglePaused()
        this.status_tracker.setMessage('Ship has crashed!')
      }.bind(this))
    }

    klass.prototype.addManeuver = function(condition, heading, absolute, throttle) {
      var man = new namespace.Maneuver(this.ship, condition, this.status_tracker, heading, absolute, throttle)
      this.maneuvers.push(man)
      return man.getDeferred()
    }

    klass.prototype.addSOIChangeManeuver = function(body, heading, absolute, throttle) {
      var man = new namespace.Maneuver(this.ship, function() { return true }, this.status_tracker, heading, absolute, throttle),
          fn = function(ship, new_body, t) {
            if (new_body !== body) return false

            this.run(t)
            this.ship.unobserve('after:soiChange', fn)
            return true
          }
      this.ship.observe('after:soiChange', fn.bind(man))
      return man.getDeferred()
    }

    function executeManeuvers(maneuvers, t) {
      for (var i = maneuvers.length; i--; ) {
        if (maneuvers[i].run(t)) {
          maneuvers.splice(i, 1)
        }
      }
    }

    klass.prototype.initObservers = function() {
      for (var i = this.ship_observers.length; i--; ) {
        this.ship.observe('after:step', this.ship_observers[i])
      }
    }

    klass.prototype.focusOnShip = function() {
      this.renderer.track(this.ship)
    }

    klass.prototype.addObserver = function(observer) {
      this.ship_observers.push(observer)
    }

    makeObservable.bind(this)(klass)

    return klass
  })()
})(FlightPlanner.Model, FlightPlanner.Helper.makeObservable)
