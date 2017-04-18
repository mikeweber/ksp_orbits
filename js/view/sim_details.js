(function(namespace) {
  namespace.SimDetails = (function() {
    var klass = function SimDetails(canvas, player) {
      this.init(canvas)
      this.player = player
    }

    klass.prototype = Object.create(namespace.SceneRenderer.prototype)
    klass.prototype.constructor = klass

    klass.prototype.render = function() {
      var context = this.getContext()
      context.textAlign = 'start'
      context.textBaseline = 'bottom'
      this.print('Zoom: ' + this.parent_renderer.zoom.round(), 5, 10)
      this.print('Warp: ' + this.player.sim.tick_size, 5, 20)
      this.print(this.player.sim.getKerbalDate(), 5, 30)
      this.print('MET: ' + this.player.sim.t.round(), 5, 40)
      var current_mission = this.player.getCurrentMission()
      if (current_mission) {
        mission_time_msg = 'T+' + current_mission.getMissionTime(this.player.sim.t).round()
        this.print(mission_time_msg, 5, 50)
      }
      var tracking = this.parent_renderer.getTrackingName()
      if (tracking) {
        this.print('Focused on ' + tracking, 5, 60)
      }
    }

    return klass
  })()
})(FlightPlanner.View)
