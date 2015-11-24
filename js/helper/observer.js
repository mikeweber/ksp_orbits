(function(namespace) {
  namespace.makeObservable = function(klass) {
    klass.prototype.execute = function(fn_name) {
      var fn          = this[fn_name],
          fn_args     = Array.prototype.slice.call(arguments, 1),
          before_args = Array.prototype.slice.call(arguments, 1),
          after_args  = Array.prototype.slice.call(arguments, 1)
      if (typeof fn !== 'function') return

      before_args.unshift('before:' + fn_name)
      after_args.unshift('after:' + fn_name)
      this.notifyObservers.apply(this, before_args)
      this[fn_name].apply(this, fn_args)
      this.notifyObservers.apply(this, after_args)
    }

    klass.prototype.observe = function(name, fn) {
      if (!this.observers)       this.observers = {}
      if (!this.observers[name]) this.observers[name] = []

      this.observers[name].push(fn)
    }

    klass.prototype.unobserve = function(name, fn) {
      var observers = this.getObserversFor(name)
      if (!observers) return false

      for (var i = observers.length; i--; ) {
        if (observers[i] === fn) {
          observers.splice(i, 1)
          return true
        }
      }

      return false
    }

    klass.prototype.notifyObservers = function(observer_name) {
      var observers = this.getObserversFor(observer_name),
          args      = Array.prototype.slice.call(arguments, 1)
      for (var i = observers.length; i--; ) {
        observers[i].apply(this, args)
      }
    }

    klass.prototype.getObserversFor = function(name) {
      if (!this.observers) this.observers = {}
      return this.observers[name] || []
    }
  }
})(FlightPlanner.Helper)
