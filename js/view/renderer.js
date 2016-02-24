/* global FlightPlanner Decimal */

(function(namespace, helpers, makeObservable) {
  'use strict'

  namespace.Renderer = (function() {
    var klass = function Renderer(canvas, world_size, canvas_size) {
      this.canvas       = canvas
      this.context      = this.canvas.getContext('2d')
      this.context.font = '12px "Times New Roman"'
      this.world_size   = { 'width': new Decimal(world_size.width),  'height': new Decimal(world_size.height) }
      this.canvas_size  = { 'width': new Decimal(canvas_size.width), 'height': new Decimal(canvas_size.height) }
      this.origin       = { x: this.canvas_size.width / 2, y: this.canvas_size.height / 2 }
      this.zoom         = new Decimal(1)
      this.renderers    = []
      this.initCanvas(this.canvas)
    }

    klass.prototype.registerRenderer = function(renderer) {
      this.setDelegators(renderer)
      this.renderers.push(renderer)
      renderer.setParentRenderer(this, this.canvas)
    }

    klass.prototype.setDelegators = function(obj) {
      for (var fn_name in klass.prototype) {
        if (!obj[fn_name] && klass.prototype.hasOwnProperty(fn_name)) {
          obj[fn_name] = klass.prototype[fn_name].bind(this)
        }
      }
    }

    klass.prototype.track = function(celestial_object) {
      for (var i = this.renderers.length; i--; ) {
        if (isTrackable(this.renderers[i]) && this.renderers[i].body == celestial_object) {
          this.tracking = this.renderers[i]
          return
        }
      }
    }

    klass.prototype.getTrackingName = function() {
      return this.tracking ? this.tracking.body.name : null
    }

    klass.prototype.getContext = function() {
      return this.context
    }

    klass.prototype.smoothZoomOut = function() {
      this.zoomTo(this.zoom.minus(this.getSmoothZoomFactor()))
    }

    klass.prototype.smoothZoomIn = function() {
      this.zoomTo(this.zoom.plus(this.getSmoothZoomFactor()))
    }

    klass.prototype.zoomOut = function() {
      this.zoomTo(this.zoom.times(0.5))
    }

    klass.prototype.zoomIn = function() {
      this.zoomTo(this.zoom.times(2))
    }

    klass.prototype.getSmoothZoomFactor = function() {
      return this.zoom.times(0.1)
    }

    klass.prototype.getZoomFactor = function() {
      return this.zoom.times(0.5)
    }

    klass.prototype.getZoom = function() {
      return this.zoom
    }

    klass.prototype.zoomTo = function(zoom) {
      if (zoom.lt(1))     zoom = new Decimal(1)
      if (zoom.gt(35000)) zoom = new Decimal(35000)
      this.zoom = new Decimal(zoom)
    }

    klass.prototype.trackNext = function() {
      this.moveTracker(1)
    }

    klass.prototype.trackPrev = function() {
      this.moveTracker(-1)
    }

    klass.prototype.moveTracker = function(i) {
      var trackables = this.getTrackables()
      this.tracking = trackables[(trackables.indexOf(this.tracking) + trackables.length + i) % trackables.length]
    }

    klass.prototype.getTrackables = function() {
      var a = []
      for (var i = this.renderers.length; i--; ) {
        if (isTrackable(this.renderers[i])) {
          a.push(this.renderers[i])
        }
      }
      return a
    }

    function isTrackable(renderer) {
      return renderer.constructor === namespace.PlanetRenderer
    }

    klass.prototype.getViewportX = function() {
      return this.world_size.width.dividedBy(this.zoom)
    }

    klass.prototype.getViewportY = function() {
      return this.world_size.height.dividedBy(this.zoom)
    }

    klass.prototype.getOffset = function(t) {
      if (this.tracking) {
        return this.tracking.body.getCoordinates(t)
      } else {
        return { x: new Decimal(0), y: new Decimal(0) }
      }
    }

    klass.prototype.initCanvas = function(canvas) {
      canvas.width        = this.getCanvasWidth()
      canvas.height       = this.getCanvasHeight()
      canvas.style.width  = this.getCanvasWidth()
      canvas.style.height = this.getCanvasHeight()
    }

    klass.prototype.getCanvasWidth = function() {
      return this.canvas_size.width
    }

    klass.prototype.getCanvasHeight = function() {
      return this.canvas_size.height
    }

    klass.prototype.convertLocalToCanvas = function(parent, local_pos, t) {
      var parent_coords = parent.getCoordinates(t),
          local_coords  = helpers.posToCoordinates(local_pos)
      return this.convertWorldToCanvas({ x: parent_coords.x.plus(local_coords.x), y: parent_coords.y.plus(local_coords.y) }, t)
    }

    klass.prototype.convertWorldToCanvas = function(coords, t) {
      return {
        x: this.scaleWorldToCanvasX(coords.x.minus(this.getOffset(t).x)).plus(this.origin.x),
        y: this.scaleWorldToCanvasY(this.getOffset(t).y.minus(coords.y)).plus(this.origin.y)
      }
    }

    klass.prototype.scaleWorldToCanvasX = function(point) {
      return new Decimal(point).dividedBy(this.world_size.width).times(this.canvas_size.width / 2).times(this.zoom)
    }

    klass.prototype.scaleWorldToCanvasY = function(point) {
      return new Decimal(point).dividedBy(this.world_size.height).times(this.canvas_size.height / 2).times(this.zoom)
    }

    klass.prototype.render = function(t) {
      this.notifyObservers('before:render', t)
      var cleared_scenes = []
      for (var i = this.renderers.length; i--; ) {
        var renderer = this.renderers[i], context = renderer.getContext()
        if (cleared_scenes.indexOf(context) === -1) {
          cleared_scenes.push(context)
          renderer.clear()
        }
        renderer.render(t)
      }
      this.notifyObservers('after:render', t)
    }

    makeObservable(klass)

    return klass
  })()
})(FlightPlanner.View, FlightPlanner.Helper.Helper, FlightPlanner.Helper.makeObservable)
