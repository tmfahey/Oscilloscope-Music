/**
 * Lissa Juice: Online audio visualization
 *
 * Matt Tytel and Noura Howell
 *
 * Copyright (c) 2013
 * Under MIT and GPL licenses:
 *  http://www.opensource.org/licenses/mit-license.php
 *  http://www.gnu.org/licenses/gpl.html
 */

lissa.controls = {};

lissa.controls.knob = function($container, f, settings) {
  var $knob = null;

  function render() {
    // TODO should empty and re-fill the container
    // because render can be called more than once
    // to do this, make each knob have a container just for itself
    // so that the order of making knobs doesn't matter
    $container.append(lissa.templates.templates.knob(settings));
    $knob = $container.find('#'+settings.id).first();
    $knob.knob({change: f});
    $knob.on('change', function(ev) {
      f($knob.val());
    });
  }

  function getVal() {
    return parseInt($knob.val());
  }

  function setVal(val) {
    $knob.val(val).trigger('change');
    f(val);
  }

  return {
    render: render,
    getVal: getVal,
    setVal: setVal,
  };
};

lissa.controls.oscillator = function($container, oscillators) {
  // model is a lissa.oscillator()
  var oscillators_ = oscillators;
  var selected_ = 0;
  var selected_oscillator_ = oscillators[selected_];

  var multiply_knob = null;
  var divide_knob = null;
  var detune_knob = null;
  var phase_knob = null;
  var sin_knob = null;
  var tri_knob = null;
  var sqr_knob = null;
  var saw_knob = null;
  var freq_knob = null;
  var lowcut_knob = null;
  var highcut_knob = null;
  var offset_knob = null;

  var multiply_knob_settings = {
    label: 'MULTIPLY',
    min_val: 1,
    max_val: 12,
    default_val: 1,
    id: get_id('multiply-knob'),
  };
  var divide_knob_settings = {
    label: 'DIVIDE',
    min_val: 1,
    max_val: 12,
    default_val: 1,
    id: get_id('divide-knob'),
  };
  var detune_knob_settings = {
    label: 'DETUNE',
    min_val: -100,
    max_val: 100,
    default_val: 0,
    id: get_id('detune-knob'),
  };
  var phase_knob_settings = {
    label: 'PHASE',
    min_val: -180,
    max_val: 180,
    default_val: selected_oscillator_.getPhase() * 360,
    id: get_id('phase-knob'),
  };
  var sin_knob_settings = {
    label: 'SIN',
    min_val: 0,
    max_val: 100,
    default_val: selected_oscillator_.getAmp('sin') * 100,
    id: get_id('sin-knob'),
  };
  var tri_knob_settings = {
    label: 'TRI',
    min_val: 0,
    max_val: 100,
    default_val: selected_oscillator_.getAmp('tri') * 100,
    id: get_id('tri-knob'),
  };
  var sqr_knob_settings = {
    label: 'SQR',
    min_val: 0,
    max_val: 100,
    default_val: selected_oscillator_.getAmp('sqr') * 100,
    id: get_id('sqr-knob'),
  };
  var saw_knob_settings = {
    label: 'SAW',
    min_val: 0,
    max_val: 100,
    default_val: selected_oscillator_.getAmp('saw') * 100,
    id: get_id('saw-knob'),
  };
  var lowcut_knob_settings = {
    label: 'LOW CUT',
    min_val: 0,
    max_val: 100,
    default_val: 0,
    id: get_id('lowcut-knob'),
  };
  var highcut_knob_settings = {
    label: 'HIGH CUT',
    min_val: 0,
    max_val: 100,
    default_val: 100,
    id: get_id('highcut-knob'),
  };
  var offset_knob_settings = {
    label: 'OFFSET',
    min_val: 0,
    max_val: 100,
    default_val: 0,
    id: get_id('offset-knob'),
  };
  var freq_knob_settings = {
    label: 'FREQ',
    min_val: 1,
    max_val: 5000,
    default_val: 200,
    id: get_id('freq-knob'),
  };

  // $container.attr('id') is used to prefix the ids of the knobs
  function get_id(s) {
    return $container.attr('id') + '-' + s;
  }

  function wave_amp_setter(type, max) {
    return function(val) {
      selected_oscillator_.setAmp(type, val / max);
    };
  }

  function render() {
    var $el = lissa.templates.templates.oscillator();
    $container.append($el);

    var $col1 = $container.find('.knob-column.col-1').first();
    var $col2 = $container.find('.knob-column.col-2').first();
    var $col3 = $container.find('.knob-column.col-3').first();

    freq_knob = lissa.controls.knob($col1,
      function(val) {
        selected_oscillator_.setFreq(val);
      }, freq_knob_settings);
    freq_knob.render();

    multiply_knob = lissa.controls.knob($col2,
      function(val) {
        selected_oscillator_.setMultiple(val);
      }, multiply_knob_settings);
    multiply_knob.render();

    divide_knob = lissa.controls.knob($col3,
      function(val) {
        selected_oscillator_.setDivisor(val);
      }, divide_knob_settings);
    divide_knob.render();

    lowcut_knob = lissa.controls.knob($col1,
      function(val) {
        selected_oscillator_.setLowCut(val / 100);
      }, lowcut_knob_settings);
    lowcut_knob.render();

    highcut_knob = lissa.controls.knob($col2,
      function(val) {
        selected_oscillator_.setHighCut(val / 100);
      }, highcut_knob_settings);
    highcut_knob.render();

    offset_knob = lissa.controls.knob($col3,
      function(val) {
        selected_oscillator_.setOffset(val / 100);
      }, offset_knob_settings);
    offset_knob.render();

    sin_knob = lissa.controls.knob($col1,
        wave_amp_setter('sin', sin_knob_settings.max_val), sin_knob_settings);
    sin_knob.render();

    tri_knob = lissa.controls.knob($col2,
        wave_amp_setter('tri', tri_knob_settings.max_val), tri_knob_settings);
    tri_knob.render();

    sqr_knob = lissa.controls.knob($col3,
        wave_amp_setter('sqr', sqr_knob_settings.max_val), sqr_knob_settings);
    sqr_knob.render();

    saw_knob = lissa.controls.knob($col1,
        wave_amp_setter('saw', saw_knob_settings.max_val), saw_knob_settings);
    saw_knob.render();

    phase_knob = lissa.controls.knob($col2,
      function(val) {
        selected_oscillator_.setPhase(val / 360);
      }, 
      phase_knob_settings);
    phase_knob.render();

    detune_knob = lissa.controls.knob($col3,
      function(val) {
        selected_oscillator_.setDetune(Math.pow(2, val / 12000.0));
      }, detune_knob_settings);
    detune_knob.render();

    updateOscillator(1);
  }

  function onOscillatorChange(event){
    updateOscillator(event.data.oscillator);
  }

  function onChannelChange(event){
    var channel_state = selected_oscillator_.getChannels();
    if(event.data.channel == 'left'){
      channel_state[0] = !channel_state[0];
    }else if(event.data.channel == 'right'){
      channel_state[1] = !channel_state[1];
    }
    updateChannel(channel_state);
  }

  function onOperationChange(event){
    updateOperation(event.data.operation);
  }

  function updateOperation(operation){
    selected_oscillator_.setOperator(operation);
    updateTitle();
  }

  function updateChannel(channel_state){
    selected_oscillator_.setChannels(channel_state);
    updateTitle();
  }

  function updateOscillator(oscillator){
    selected_ = oscillator;
    selected_oscillator_ = oscillators_[selected_-1];
    updateTitle();
    updateKnobs();
  }

  function updateKnobs(){    
    freq_knob.setVal(selected_oscillator_.getFreq());
    multiply_knob.setVal(selected_oscillator_.getMultiple());
    divide_knob.setVal(selected_oscillator_.getDivisor());
    lowcut_knob.setVal(selected_oscillator_.getLowCut()*100);
    highcut_knob.setVal(selected_oscillator_.getHighCut()*100);
    offset_knob.setVal(selected_oscillator_.getOffset()*100);
    sin_knob.setVal(selected_oscillator_.getAmp('sin')*sin_knob_settings.max_val);
    tri_knob.setVal(selected_oscillator_.getAmp('tri')*tri_knob_settings.max_val);
    sqr_knob.setVal(selected_oscillator_.getAmp('sqr')*sqr_knob_settings.max_val);
    saw_knob.setVal(selected_oscillator_.getAmp('saw')*saw_knob_settings.max_val);
    phase_knob.setVal(selected_oscillator_.getPhase()*360);
    detune_knob.setVal(Math.log(selected_oscillator_.getDetune()) / Math.log(2) * 12000);
  }

  function updateTitle(){
    var $title = $container.find('.oscillator-title').first();
    var channel_state = selected_oscillator_.getChannels();
    var channel_string = (channel_state[0]&&channel_state[1]) ? 'Both' :
      channel_state[0] ? 'L' : 
      channel_state[1] ? 'R' :
      'Disabled';
    $title.text('Channel ' + selected_ + ' ' + 
      selected_oscillator_.getOperator() + ' ' + channel_string);
  }

  function randomize() {
    multiply_knob.setVal(lissa.utils.random_int(1,5));
    divide_knob.setVal(lissa.utils.random_int(1,5));
    detune_knob.setVal(lissa.utils.random_int(-7,7));
    var sin_amount = lissa.utils.random_int(0,100);
    var tri_amount = lissa.utils.random_int(0,100);
    var sqr_amount = 0;
    var saw_amount = 0;
    var sum = sin_amount+tri_amount+sqr_amount+saw_amount;
    var freq_amount = lissa.utils.random_int(1,500);

    sin_knob.setVal(sin_amount/sum*100|0);
    tri_knob.setVal(tri_amount/sum*100|0);
    sqr_knob.setVal(sqr_amount/sum*100|0);
    saw_knob.setVal(saw_amount/sum*100|0);
    freq_knob.setVal(freq_amount);
  }

  return {
    render: render,
    randomize: randomize,
    onChannelChange: onChannelChange,
    onOperationChange: onOperationChange,
    onOscillatorChange: onOscillatorChange
  };
};

lissa.controls.minicolors = function($container) {
  function init() {
    $container.each(function() {
      $(this).minicolors({
        animationSpeed: 0,
        textfield: !$(this).hasClass('no-textfield'),
        change: function(hex, opacity) {
          var red = parseInt(hex.substring(1, 3), 16);
          var green = parseInt(hex.substring(3, 5), 16);
          var blue = parseInt(hex.substring(5, 7), 16);
          lissa.figure.setColor(red, green, blue);
        },
      });
    });
  }

  function randomize() {
    var red = Math.floor(256 * Math.random());
    var green = Math.floor(256 * Math.random());
    var blue = Math.floor(256 * Math.random());
    lissa.figure.setColor(red, green, blue);

    var red_hex = '0' + red.toString(16);
    var green_hex = '0' + green.toString(16);
    var blue_hex = '0' + blue.toString(16);
    $container.minicolors('value', '#' + red_hex.substring(red_hex.length - 2)
                                + green_hex.substring(green_hex.length - 2)
                                + blue_hex.substring(blue_hex.length - 2));
  }

  return {
    init: init,
    randomize: randomize,
  };
};

lissa.controls.init = function($container) {
  var controls_shown = false;
  var oscillator_controls = lissa.controls.oscillator(
    $container.find('#oscillator-controls').first(),
    lissa.synth.oscillators
  );
  oscillator_controls.render();
  if (!controls_shown)
    $('.controls').hide();
  var $controls_button = $container.find('.controls-toggle').first();
  var $plus_button = $container.find('.op-plus').first();
  var $subtract_button = $container.find('.op-subtract').first();
  var $multiply_button = $container.find('.op-multiply').first();
  var $divide_button = $container.find('.op-divide').first();

  $controls_button.on('click', toggleControls);
  $plus_button.on('click', {operation: '+'}, oscillator_controls.onOperationChange);
  $subtract_button.on('click', {operation: '-'}, oscillator_controls.onOperationChange);
  $multiply_button.on('click', {operation: '*'}, oscillator_controls.onOperationChange);
  $divide_button.on('click', {operation: '/'}, oscillator_controls.onOperationChange);

  var $ch_left_button = $container.find('.ch-left').first();
  var $ch_right_button = $container.find('.ch-right').first();

  $ch_left_button.on('click', {channel: 'left'}, oscillator_controls.onChannelChange);
  $ch_right_button.on('click', {channel: 'right'}, oscillator_controls.onChannelChange);

  for(var i=1; i<9; i++){
    $container.find('.osc-'+i).first().on('click', {oscillator: i}, 
      oscillator_controls.onOscillatorChange);
  }

  //TODO make minicolors scoped within the container somehow
  //or take its location as an input
  var minicolors = lissa.controls.minicolors($('.minicolors'));
  minicolors.init();

  function toggleControls() {
    controls_shown = !controls_shown;
    if (controls_shown) {
      $('.controls').fadeTo(150, 0.75);
      $controls_button.text('Hide');
    }
    else {
      $('.controls').fadeOut(150);
      $controls_button.text('Controls');
    }
  }

};

lissa.templates = function() {
  // http://underscorejs.org/#template
  // The skinny: Templates are super helpful for dynamically creating HTML
  // that gets used multiple times, but with a few parameters changed.
  // Underscore templates are sweet because you can pass in an arbitrary
  // JavaScript object and execute JavaScript code inside the template.
  function init() {
    // a wrapper around _.template to give error messages
    var that = this;
    $('script[type="underscore/template"]').each(function() {
      var template = null;
      var $this = $(this);
      var id = $(this).attr('id');

      try {
        template = _.template($this.text());
      }
      catch (error) {
        console.log('Error compiling template', id, error);
      }

      that.templates[id] = function() {
        try {
          return template.apply(this, arguments);
        }
        catch (error) {
          console.log('Error executing template', id, error);
        }
      };
    });
  }
  return {
    templates: {},
    init: init,
  };
}();

