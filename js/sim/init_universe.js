/* global Decimal FlightPlanner */

(function(namespace, $) {
  'use strict'

  namespace.initUniverse = function(start_sim_at) {

    var system    = new FlightPlanner.SolarSystem(),
        canvas    = $('#flightplan')[0],
        conics    = $('#flightpaths')[0],
        ships     = $('#ships')[0],
        info      = $('#info')[0],
        sun_r     = new FlightPlanner.View.PlanetRenderer(canvas, system.sun,    '#FFFF00', 7),
        kerbin_r  = new FlightPlanner.View.PlanetRenderer(canvas, system.kerbin, '#7777FF', 4),
        duna_r    = new FlightPlanner.View.PlanetRenderer(canvas, system.duna,   '#FF3333', 4),
        mun_r     = new FlightPlanner.View.PlanetRenderer(canvas, system.mun,    '#DDDDDD', 4),
        minmus_r  = new FlightPlanner.View.PlanetRenderer(canvas, system.minmus, '#A9D0D5', 4),
        ike_r     = new FlightPlanner.View.PlanetRenderer(canvas, system.ike,    '#999999', 4),
        sun_cr    = new FlightPlanner.View.ConicRenderer(conics, system.sun),
        kerbin_cr = new FlightPlanner.View.ConicRenderer(conics, system.kerbin),
        duna_cr   = new FlightPlanner.View.ConicRenderer(conics, system.duna),
        mun_cr    = new FlightPlanner.View.ConicRenderer(conics, system.mun),
        minmus_cr = new FlightPlanner.View.ConicRenderer(conics, system.minmus),
        ike_cr    = new FlightPlanner.View.ConicRenderer(conics, system.ike),
        size      = 2.3e10,
        world     = { width: size, height: size },
        canvas_dimensions = { width: 700, height: 700 },
        bg        = $('#background')[0],
        renderer  = new FlightPlanner.View.Renderer(canvas, world, canvas_dimensions),
        sim       = new FlightPlanner.Controller.Simulator(start_sim_at, system, 10),
        player    = new FlightPlanner.Controller.Player(sim, renderer)

    renderer.registerRenderer(new FlightPlanner.View.BackgroundRenderer(bg))
    renderer.registerRenderer(new FlightPlanner.View.SimDetails(info, player))
    renderer.registerRenderer(sun_cr)
    renderer.registerRenderer(kerbin_cr)
    renderer.registerRenderer(duna_cr)
    renderer.registerRenderer(mun_cr)
    renderer.registerRenderer(minmus_cr)
    renderer.registerRenderer(ike_cr)
    renderer.registerRenderer(sun_r)
    renderer.registerRenderer(kerbin_r)
    renderer.registerRenderer(duna_r)
    renderer.registerRenderer(mun_r)
    renderer.registerRenderer(minmus_r)
    renderer.registerRenderer(ike_r)

    return player
  }

  namespace.followShipAndTarget = function(ship, final_target, player, t) {
    var zoom, coords1, coords3, zoom_x, zoom_y, dist_x, dist_y, dist_x2, dist_y2, port_x, port_y,
        closest_zoom = 500,
        coords2      = ship.getCoordinates(t),
        cur_target   = { getCoordinates: function() { return coords2 } }

    player.renderer.track(ship)
    function follow(t) {
      coords1 = ship.getCoordinates(t)
      coords2 = cur_target.getCoordinates(t)
      port_x  = player.renderer.getViewportX().times(0.8)
      port_y  = player.renderer.getViewportY().times(0.8)
      dist_x  = coords1.x.minus(coords2.x).abs()
      dist_y  = coords1.y.minus(coords2.y).abs()
      if (cur_target !== final_target) {
        coords3 = final_target.getCoordinates(t)
        dist_x2 = coords1.x.minus(coords3.x).abs()
        dist_y2 = coords1.y.minus(coords3.y).abs()
        if (dist_x2.lt(port_x) && dist_y2.lt(port_y)) {
          cur_target = final_target
          dist_x     = dist_x2
          dist_y     = dist_y2
        }
      }

      zoom = new Decimal(Math.min(player.renderer.world_size.width.dividedBy(dist_x), player.renderer.world_size.height.dividedBy(dist_y))).times(0.8)
      if (zoom.lt(closest_zoom)) {
        player.renderer.zoomTo(zoom)
      }
    }

    player.renderer.observe('before:render', follow)
    player.observe('after:smoothZoomIn',  function() { player.renderer.unobserve('before:render', follow) })
    player.observe('after:smoothZoomOut', function() { player.renderer.unobserve('before:render', follow) })
    player.observe('after:trackNext',     function() { player.renderer.unobserve('before:render', follow) })
    player.observe('after:trackPrev',     function() { player.renderer.unobserve('before:render', follow) })
  }

  namespace.addListeners = function(player) {
    'use strict'

    $('#pause').on(      'click', function() { player.execute('togglePaused') })
    $('#zoom_in').on(    'click', function() { player.execute('zoomIn') })
    $('#zoom_out').on(   'click', function() { player.execute('zoomOut') })
    $('#faster').on(     'click', function() { player.execute('speedUp') })
    $('#slower').on(     'click', function() { player.execute('slowDown') })
    $('#prev_target').on('click', function() { player.execute('trackPrev') })
    $('#next_target').on('click', function() { player.execute('trackNext') })
    $('#reset').on(      'click', function() { player.execute('reset') })
    $(window).on('keyup', function(e) {
      var key = e.keyCode ? e.keyCode : e.which

      if (key === 27 || key === 32) {
        // esc
        player.execute('togglePaused')
      } else if (key === 190) {
        // >
        player.execute('speedUp')
      } else if (key === 188) {
        // <
        player.execute('slowDown')
      } else if (key === 221) {
        // [
        player.execute('trackNext')
      } else if (key === 219) {
        // ]
        player.execute('trackPrev')
      }
    })

    $(window).on('keydown', function(e) {
      var key = e.keyCode ? e.keyCode : e.which
      if (key === 187) {
        // +
        player.execute('smoothZoomIn')
      } else if (key === 189) {
        // -
        player.execute('smoothZoomOut')
      }
    })
  }
})(FlightPlanner.Sim, jQuery)
