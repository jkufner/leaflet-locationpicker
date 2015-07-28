/*
TODO
(function(factory){
    if (typeof define === "function" && define.amd) {
        define(['jquery','leaflet'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'), require('leaflet'));
    } else {
        factory(jQuery, L);
    }
}*/
(function(jQuery, L){

	var $ = jQuery;

	$.fn.leafletLocationPicker = function(opts, onChangeLocation) {

		var baseClassName = 'leaflet-locpicker'
			baseDataName = 'locpicker',
			baseLayers = {
				'OSM': 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
				'SAT': 'http://otile1.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png'
				//TODO add more free base layers
			};

		var optsMap = {
				zoom: 3,			
				center: L.latLng([41.8,12.5]),
				zoomControl: false,
				attributionControl: false
			};

		if($.isPlainObject(opts) && $.isPlainObject(opts.map))
			optsMap = $.extend(optsMap, opts.map);

		var defaults = {
			className: baseClassName,
			location: optsMap.center,
			locationFormat: '{lat}{sep}{lng}',	
			locationMarkerText: '&oplus;',
			locationMarker: true,
			locationDigits: 4,	
			locationSep: ',',				
			activeOnMove: true,
			position: 'topright',			
			layer: 'OSM',			
			height: 120,
			width: 180,			
			map: optsMap,			
			onChangeLocation: $.noop
		};

		if($.isPlainObject(opts))
			opts = $.extend(defaults, opts);

		else if($.isFunction(opts))
			opts = $.extend(defaults, {
				onChangeLocation: opts
			});
		else
			opts = defaults;

		if($.isFunction(onChangeLocation))
			opts = $.extend(defaults, {
				onChangeLocation: onChangeLocation
			});

		function roundLocation(loc) {
			return loc ? L.latLng(
				parseFloat(loc.lat).toFixed(opts.locationDigits),
				parseFloat(loc.lng).toFixed(opts.locationDigits)
			) : loc;
		}

		function parseLocation(loc) {
			var retLoc = loc;

			switch($.type(loc)) {
				case 'string':
					var ll = loc.split(opts.locationSep);
					if(ll[0] && ll[1])
						retLoc = L.latLng(ll);
					else
						retLoc = null;
				break;	    		
				/*case 'array':
					retLoc = L.latLng(loc);
				break;
				case 'object':
					var lat, lng;

					if(loc.hasOwnProperty('lat'))
						lat = loc.lat;
					else if(loc.hasOwnProperty('latitude'))
						lat = loc.latitude;

					if(loc.hasOwnProperty('lng'))
						lng = loc.lng;
					else if(loc.hasOwnProperty('lon'))
						lng = loc.lon;
					else if(loc.hasOwnProperty('longitude'))
						lng = loc.longitude;

					retLoc = L.latLng(parseFloat(lat),parseFloat(lng));
				break;*/
				default:
					retLoc = loc;		
			}
			return roundLocation( retLoc );
		}

		function buildMap(self) {

			self.divMap = document.createElement('div');
			self.$map = $(document.createElement('div'))
				.addClass(opts.className + '-map')
				.height(opts.height)
				.width(opts.width)
				.append(self.divMap)
				.appendTo('body');

			if(self.location)
				opts.map.center = self.location;

			if(typeof opts.layer === 'string' && baseLayers[opts.layer])
				opts.map.layers = L.tileLayer(baseLayers[opts.layer]);

			else if(opts.layer instanceof L.TileLayer ||
					opts.layer instanceof L.LayerGroup )
				opts.map.layers = opts.layer;

			else
				opts.map.layers = L.tileLayer( baseLayers[defaults.layer] );

			//leaflet map
			self.map = L.map(self.divMap, opts.map)
				.addControl( L.control.zoom({position:'bottomright'}) )
				.on('click', function(e) {
					self.setLocation(e.latlng);
				});

			if(opts.activeOnMove)
				self.map.on('move', function(e) {
					self.setLocation(e.target.getCenter());
				});

			var xmap = L.control({position: 'topright'});
			xmap.onAdd = function(map) {
				var btn = L.DomUtil.create('div','leaflet-control '+opts.className+'-close');
				btn.innerHTML = '&times;';
				L.DomEvent
					.on(btn, 'click', L.DomEvent.stop, self)
					.on(btn, 'click', self.closeMap, self);
				return btn;
			};
			xmap.addTo(self.map);

			if(opts.locationMarker)
				self.marker = buildMarker(self.location).addTo(self.map);

			return self.$map;
		}

		function buildMarker(loc) {
			return L.marker( parseLocation(loc) || L.latLng(0,0), {
				icon: L.divIcon({
					className: opts.className+'-marker',
					html: opts.locationMarkerText,
				})
			});
		}

		return this.each(function(index) {

		    var self = this,
		    	$self = $(self);
		    	//data = $self.data(opts.baseDataName);

		    self.locationOri = $self.val();

			self.onChangeLocation = function() {
				var edata = {
					location: self.getLocation(),
					latlng: self.location,					
					map: self.map					
				};
				$self.trigger($.extend(edata, {
					type: 'changeLocation'
				}));
				opts.onChangeLocation.call(self, edata);
			};

		    self.setLocation = function(loc, nocall) {
		    	self.location = parseLocation(loc);
		    	if(self.marker)
		    		self.marker.setLatLng(loc);
		    	$self.data('location', self.location);
		    	$self.val( self.getLocation() );
		    	self.onChangeLocation();
		    	return self;
		    };

		    self.getLocation = function() {
		    	return self.location ? L.Util.template(opts.locationFormat, {
		    		lat: self.location.lat,
		    		lng: self.location.lng,
		    		sep: opts.locationSep
		    	}) : self.location;
		    };

		    self.openMap = function() {
		    	switch(opts.position) {
					case 'bottomleft':
						self.$map.css({
							top: $self.offset().top + $self.height() + 6,
							left: $self.offset().left 
						});
					break;
					case 'topright':
						self.$map.css({
							top: $self.offset().top,
							left: $self.offset().left + $self.width() + 5
						});
					break;
				}

				self.$map.show();
				self.map.invalidateSize();
				return $self.trigger('show');
			};

		    self.closeMap = function() {
				self.$map.hide();
				return $self.trigger('hide');
		    };

			self.setLocation(self.locationOri);

		    self.$map = buildMap(self);

		    $self.openMap = self.openMap;
		    $self.closeMap = self.closeMap;

		    $self
		    .addClass(opts.className)
		    .on('focus.'+opts.className, function(e) {
		        e.preventDefault();
		        self.openMap();
		    });
		});
	};

})(jQuery, L);


/*	TODO    .on('blur.'+opts.className, function(e) {
		        e.preventDefault();
		        console.log(e.originalEvent.relatedTarget);
				//if(!self.$map.contains(e.originalEvent.relatedTarget))
				//	self.closeMap();
			});*/
			/*
			TODO AUTOHIDE MAP
			function resetInput() {
			    $self.val(self.locationOri).removeData('location');
			}
			self.$map
			.on('mouseout.confirm', function() {
			    self.timeoToken = setTimeout(resetInput, opts.timeout);
			})
			.on('mouseover.confirm', function() {
			    clearTimeout(self.timeoToken);
			});*/