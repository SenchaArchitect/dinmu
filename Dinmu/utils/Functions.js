Ext.define('Dinmu.utils.Functions', {
    singleton: true,
    //singleton methods here
	requires: [
			'Ext.data.JsonP',
			'Ext.device.Geolocation',
			'Ext.MessageBox'
	],

	API_KEY: 'ahda57e4e34pe35ar5pjekbh', //http://api.worldweatheronline.com/

	/* 
	The method loadData() starts with showing a loading mask. 
	This will display a loading throbber on the top of the Ext.Viewport, 
	so it will be nice centered in the middle. 
	The loadData() function takes one argument: skip, 
	which is a boolean to skip the geolocation detection. 
	This will be used when using the togglefield to specify city and 
	country information. In that case you wouldnâ€™t load the positions based on 
	geolocation. We use a reference to the Settings store (Ext.getStore(Settings)) 
	and load all the settings. When there are settings saved we can prefill 
	the form based on the information. We check if the city and country values 
	are available and start requesting the weather information based on these arguments. 
	See Dinmu.utils.Functions.getWeather(city + " " + country);. 
	When city and country are not set or when there is no settings data available at all, 
	we will load the weather information based on geolocation. 
	At the end we can remove the loading mask from the Ext.Viewport.
	*/
	loadData: function() {
		var me = this;

		Ext.Viewport.setMasked({
			xtype: 'loadmask',
			indicator: true,
			message: 'Retrieve Settings...'
		});

		Ext.getStore('Settings').load({
			callback: function(records, operation, success) {

				if (records.length > 0) {

					//Load details from settings
					var units = records[0].get('units');
					var city = records[0].get('city');
					var country = records[0].get('country');
					var geo = records[0].get('geo');

					//prefill all fields
					if(!geo){
						Ext.ComponentQuery.query('settingsview togglefield[name=geo]')[0].setValue(0);
					} else {
						Ext.ComponentQuery.query('settingsview togglefield[name=geo]')[0].setValue(1);
					}
					
					Ext.ComponentQuery.query('settingsview selectfield[name=units]')[0].setValue(units);
					Ext.ComponentQuery.query('settingsview textfield[name=city]')[0].enable();
					Ext.ComponentQuery.query('settingsview textfield[name=city]')[0].setValue(city);
					Ext.ComponentQuery.query('settingsview textfield[name=country]')[0].enable();
					Ext.ComponentQuery.query('settingsview textfield[name=country]')[0].setValue(country);

					if (city && country) {
						if(country == "US" || country == "USA") country = "United States Of America";
						
						Dinmu.utils.Functions.getWeather(city + " " + country);
					} else {
						//There are no city settings saved,
						//get location from Geolocation.
						me.getCurrentLocation();
					}
				} else {
					//There are no city settings saved,
					//get location from Geolocation.
					me.getCurrentLocation();
				}

				Ext.Viewport.unmask();
			}
		});
	},
	/*
	The method getCurrentLocation() will show a loading mask too and request
	the geolocation of the device through the frameworks method: Ext.device.Geolocation.getCurrentPosition(). 
	On the success callback it creates a string place which contains a string 
	with the lat and long positions. Then it will call the static function 
	getWeather() and pass the variable place as an argument of it. 
	If the geolocation fails it will show an error in a messagebox. 
	There are 2 more properties that we will set: timeout 
	(the amount of time in ms to wait for the geolocation callback) and 
	maximumAge (the application is willing to accept cached location information 
	whose age is no greater than the specified time in milliseconds).
	*/
	getCurrentLocation: function() {
		Ext.Viewport.setMasked({
			xtype: 'loadmask',
			indicator: true,
			message: 'Detecting location...'
		});

		Ext.device.Geolocation.getCurrentPosition({
			timeout: 5000,
			maximumAge: 10000,
			success: function(position) {
				var place = position.coords.latitude + "," + position.coords.longitude;
				//console.log(place);
				Dinmu.utils.Functions.getWeather(place);
				Ext.Viewport.unmask();
			},
			failure: function() {
				Ext.Viewport.unmask();
				Ext.Msg.alert('Timeout', 'Can not retrieve position, please retry.');
			}
		});
	},
	/* 
	The getWeather() method, requests weather information from the worldweatheronline.com
	webservice. We will make a JSONP call, were we pass in the API_KEY 
	(see on top of this file), the place to request weather information from
	and amount of days to get the weather forcast from.
	*/
	getWeather: function(place) {
		Ext.data.JsonP.request({
			url: '//api.worldweatheronline.com/free/v1/weather.ashx',
			params: {
				key: Dinmu.utils.Functions.API_KEY,
				q: place,
				format: 'json',
				num_of_days: 1
			},
			success: function(result, request) {
				//console.log(result.data);
				Ext.Viewport.unmask();
				try {
					var weather = result.data.weather;
					Dinmu.utils.Functions.createTemplate(weather[0]);

				} catch (e) {
					if(result.data.error){
						Ext.Msg.alert("Error", result.data.error[0].msg);
					} else {
						Ext.Msg.alert("Oops", e);
					}
				}
			},
			failure: function(e) {
				Ext.Viewport.unmask();
				Ext.Msg.alert("Oops", "Can not request data from worldweatheronline.com");
			}
		});
	},
	
	/*
	The method createTemplate() has a variable tpl which contains a new Ext.XTemplate() 
	object. The XTemplate contains some html strings and some if else statements written 
	in tpl+s. This is the template system of Sencha Touch. Later you will pass in an 
	object with data so the html template will become dynamic. 
	With the if else statements you can do some branching, it will 
	become more powerful when you start creating custom functions. 
	These custom functions listen to the data object that was passed in. 
	There is a custom function +isCold() that checks if the temperature is below 3, 
	if so it returns true. There is a custom function isWarm() that returns a boolean 
	if the temperature is above 18. There is a custom function isRain() that checks 
	if the weather code maps to â€œrainâ€ (weather code: 265). And there are two custom 
	functions (getCity() and isC()) that return values of the settingsview form, 
	which were entered by the user as a city and unit form values. 
	The createTemplate() method has an obj with weather information as a function argument.
	After the creating of the XTemplate it will apply this object to the template 
	(the variable tpl). The next step is to display the mainview as an active item. 
	While displaying the mainview, no back button should be shown.
	*/
	createTemplate: function(obj) {
		var tpl = new Ext.XTemplate(
			'<tpl if="this.isRain(weatherCode)"><div class="rain">',
			"<span class='yes'>Yes</span>, you will need the umbrella{[this.getCity()]}. ",
			"<span class='temp'>{precipMM}mm precipitation</span> {[values.weatherDesc[0].value]}. ",
			'<tpl else>',
			"<div class='norain'><span class='no'>No</span>, you will not need the umbrella{[this.getCity()]}. ",
			"{[values.weatherDesc[0].value]}. ",
			'</tpl>',
			'<tpl if="this.isCold(tempMaxC)">',
			"But also chilly. Do not forget your scarf! ",
			'</tpl>',
			'<tpl if="this.isWarm(tempMaxC)">',
			"Enjoy this weather! ",
			'</tpl>',
			'<tpl if="this.isC()">',
			"Today's weather is <span class='temp'>{tempMaxC} &deg;C</span>.</div>",
			'<tpl else>',
			"Today's weather is <span class='temp'>{tempMaxF} &deg;F</span>.</div>",
			'</tpl>', {
			isCold: function(temp) {
				var isCold = false;
				if (temp < 3) isCold = true;
				return isCold;
			},
			isWarm: function(temp) {
				var isWarm = false;
				if (temp > 18) isWarm = true;
				return isWarm;
			},
			isRain: function(code) {
				var isRain = false;
				if (code > 265) isRain = true;
				return isRain;
			},
			getCity: function() {
				var city = "";
				try {
					if (Ext.getStore('Settings').getData().length > 0 && !Ext.getStore('Settings').getData().getAt(0).get('geo')) {
						var city = Ext.getStore('Settings').getData().getAt(0).get('city');
						city = " in " + city;
					}
				} catch (e) {
					console.log(e);
				}
				return city;
			},
			isC: function() {
				var isC = false;
				try {
					if (Ext.getStore('Settings').getData().length > 0) {
						var units = Ext.getStore('Settings').getData().getAt(0).get('units');
						if (units === "c") isC = true;
					}
				} catch (e) {
					console.log(e);
				}
				return isC;
			}
		});

		var html = tpl.apply(obj);

		Ext.ComponentQuery.query('button[action=back]')[0].hide();
		Ext.ComponentQuery.query('main')[0].setActiveItem(1);

		Ext.ComponentQuery.query('main')[0].getActiveItem().setHtml(html);

	}
});