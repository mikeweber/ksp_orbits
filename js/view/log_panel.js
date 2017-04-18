/* global FlightPlanner jQuery */
(function(namespace, $) {
  'use strict'

  namespace.LogPanel = (function() {
    var klass = function LogView(logger) {
      this.logger = this.observeLogger(logger)
      this.panel  = initPanel()
    }

    klass.prototype.observeLogger = function(logger) {
      logger.observe('after:log', this.updatePanel.bind(this))
      logger.observe('after:log_append', this.appendToPanel.bind(this))
      return logger
    }

    function initPanel() {
      return $('<div id="log-view">')
    }

    klass.prototype.updatePanel = function(message) {
      this.getPanel().prepend($('<p>').html(message))
    }

    klass.prototype.appendToPanel = function(message) {
      this.getPanel().append($('<p>').html(message))
    }

    klass.prototype.getPanel = function() {
      return this.panel
    }

    return klass
  })()
})(FlightPlanner.View, jQuery)
