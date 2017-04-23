/* global FlightPlanner Decimal Object */

(function(namespace, helpers, makeObservable) {
  'use strict'

  namespace.Simulator = (function() {
    var klass = function Simulator(time, system, tick_size, debug) {
      this.setBodies(system.getPlanets())
      this.initial_tick = tick_size
      this.initial_time = time
      this.setTime(time)
      this.tick_size    = tick_size
      this.running      = false
      this.debugger     = debug
    }

    klass.prototype.setTime = function(time) {
      this.t = new Decimal(time)
    }

    klass.prototype.removeBody = function(name) {
      for (var i = this.bodies.length; i--; ) {
        if (this.bodies[i].name === name) this.bodies.splice(i, 1)
      }
    }

    klass.prototype.addBody = function(body) {
      this.bodies.push(body)
    }

    klass.prototype.getBody = function(name) {
      for (var i = this.bodies.length; i--; ) {
        if (this.bodies[i].name === name) return this.bodies[i]
      }
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
        this.execute('stepBodies', this.t, this.tick_size)
        this.execute('debug')
        this.execute('tick')

        var crumbs = 0
        if (now - last_run > 17) {
          renderer.render(this.t)
          last_run = now
        }
        setTimeout(render.bind(this), 1)
      }.bind(this))()
    }

    klass.prototype.stepBodies = function() {
      if (!this.running) return

      for (var i = this.bodies.length; i--; ) {
        this.bodies[i].execute('step', this.t, this.tick_size, this.bodies[i])
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

    klass.prototype.faster = function() {
      this.setTickSize(this.tick_size * 2)
    }

    klass.prototype.slower = function() {
      this.setTickSize(this.tick_size * 0.5)
    }

    klass.prototype.setTickSize = function(tick) {
      if (tick < 0.25) tick = 0.25
      if (tick > 16384) tick = 16384
      this.tick_size = tick
    }

    klass.prototype.getTickSize = function() {
      return this.tick_size
    }

    klass.prototype.togglePaused = function() {
      this.running = !this.running
    }

    klass.prototype.getKerbalDate = function() {
      return helpers.convertTimeToDate(this.t)
    }

    klass.prototype.reset = function() {
      this.setTime(this.initial_time)
      this.tick_size = this.initial_tick
    }

    makeObservable(klass)

    return klass
  })()
})(FlightPlanner.Controller, FlightPlanner.Helper.Helper, FlightPlanner.Helper.makeObservable)
