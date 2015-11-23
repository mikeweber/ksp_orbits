/* global FlightPlanner Decimal Object */

(function(namespace, helpers) {
  'use strict'

  namespace.Simulator = (function() {
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
          var i
          for (i = this.bodies.length; i--; ) {
            crumbs += this.bodies[i].renderBreadcrumbs(renderer)
          }

          for (i = this.bodies.length; i--; ) {
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
      if (this.tick_size < 10000) {
        this.tick_size *= 2
        if (this.tick_size > 10000) this.tick_size = 10000
      }
    }

    klass.prototype.slower = function() {
      if (this.tick_size > 1) {
        this.tick_size *= 0.5
        if (this.tick_size < 1) this.tick_size = 1
      }
    }

    klass.prototype.togglePaused = function() {
      this.running = !this.running
    }

    klass.prototype.showSimDetails = function(renderer) {
      renderer.context.textAlign = 'start'
      renderer.context.textBaseline = 'bottom'
      renderer.print('Zoom: ' + renderer.zoom.round(), 5, 10)
      renderer.print('Warp: ' + this.tick_size, 5, 20)
      renderer.print(this.getKerbalDate(), 5, 30)
      renderer.print('T+' + this.t, 5, 40)
      renderer.print('Focused on ' + this.getTrackingName(), 5, 50)
    }

    klass.prototype.getTrackingName = function() {
      return this.tracking ? this.tracking.name : null
    }

    klass.prototype.getKerbalDate = function() {
      return helpers.convertTimeToDate(this.t)
    }

    return klass
  })()
})(FlightPlanner.Controller, FlightPlanner.Helper.Helper)
