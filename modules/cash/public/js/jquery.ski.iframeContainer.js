(function( $ ) {
	$.widget("ski.iframeContainer", {
		options: {
			autoOpen: false,		
			modal: true,
			position: {
				my: 'center',
				at: 'center',
				collision: 'fit',
				// ensure that the titlebar is never outside the document
				using: function(pos) {
					var topOffset = $(this).css(pos).offset().top;
					if (topOffset < 0) {
						$(this).css('top', pos.top - topOffset);
					}
				}
			},				
			zIndex: 1002
		},

		_create: function() {	
			console.log(this.element.attr('id'));
			if(!this.iframeContainer){
				this.iframeContainer = {};
			}	
			if(!this.iframeContent){
				this.iframeContent = {};
			}			
			var self = this,			
			options = self.options,
				iframeContainer = (self.iframeContainer[self.element.attr('id')] = $('<div class="iframeContainer iframeContainer-'+self.element.attr('id')+'"></div>'))
					.appendTo(document.body)
					.attr('data-elementid',self.element.attr('id'))
					.hide()				
					.css({
						zIndex: options.zIndex
					});
			if(!self._isDialogLoad){
				self._isDialogLoad = {};
			}
			self._isDialogLoad[self.element.attr('id')] = false;
			if(!self._waitLoadCounter){
				self._waitLoadCounter = {};
			}	
			self._waitLoadCounter[self.element.attr('id')] = 0;
		},
		_setOption: function( key, value ) {
		  switch( key ) {
			case "clear":
			  // handle changes to clear option

			  break;
		  }      

		  $.Widget.prototype._setOption.apply( this, arguments );
		},

		_init: function() {
			if ( this.options.autoOpen ) {
				this.open();
			}
			var self = this,
				iframeContainer = self.iframeContainer[self.element.attr('id')];		
			
			iframeContainer.on('openDialog',function(e,w,h,p){								
				self.iframeContent[self.element.attr('id')].width(Math.round(w));
				self.iframeContent[self.element.attr('id')].height(Math.round(h));
				self._isDialogLoad[self.element.attr('id')] = true;								
			});
			
			self.iframeContainer[self.element.attr('id')].on('closeDialog',function(e){
				self.close();
			});
		},

		destroy: function() {
			var self = this;
			
			if (self.overlay) {
				self.overlay.destroy();
			}		
			self.iframeContainer[self.element.attr('id')].remove();
			$.Widget.prototype.destroy.call( this );
			return self;
		},

		widget: function() {
			return this.iframeContainer[this.element.attr('id')];
		},

		close: function(event) {
			var self = this;
			if (self.overlay) {
				self.overlay.destroy();
			}
			self.iframeContainer[self.element.attr('id')].hide();
			$.ui.dialog.overlay.resize();
			
			self._isOpen = false;
			
			return self;
		},

		isOpen: function() {
			return this._isOpen;
		},	
		open: function() {
			console.log('open widget');
			if (this._isOpen) { return; }
			console.log('is OPEN');
			var self = this,
				options = self.options,
				iframeContainer = self.iframeContainer[self.element.attr('id')];
				
			if(!self.iframeContent[self.element.attr('id')]){
				iframeContent = (self.iframeContent[self.element.attr('id')] = $('<iframe src="'+options.src+'" ></iframe>'))				
					.appendTo(iframeContainer);	
			}			

			self.overlay = options.modal ? new $.ui.dialog.overlay(self) : null;				
			self._position(options.position);				

			self._isOpen = true;		
			iframeContainer.show();
			return self;
		},
		
		triggerEvent:function(event){			
			var self = this;			
			if(self._isDialogLoad[self.element.attr('id')]){
				self._waitLoadCounter[self.element.attr('id')] = 0;	
				self.iframeContent[self.element.attr('id')].get(0).contentWindow.postMessage(event, "https://"+self.options.host);
			}
			else if(self._waitLoadCounter[self.element.attr('id')] < 100){				
				self._waitLoadCounter[self.element.attr('id')] ++ ;
				setTimeout(function(){self.triggerEvent(event)},100);
			}
		},

		_position: function(position) {
			var myAt = [],
				offset = [0, 0],
				isVisible;

			if (position) {
				if (typeof position === 'string' || (typeof position === 'object' && '0' in position)) {
					myAt = position.split ? position.split(' ') : [position[0], position[1]];
					if (myAt.length === 1) {
						myAt[1] = myAt[0];
					}

					$.each(['left', 'top'], function(i, offsetPosition) {
						if (+myAt[i] === myAt[i]) {
							offset[i] = myAt[i];
							myAt[i] = offsetPosition;
						}
					});

					position = {
						my: myAt.join(" "),
						at: myAt.join(" "),
						offset: offset.join(" ")
					};
				} 

				position = $.extend({}, $.ui.dialog.prototype.options.position, position);
			} else {
				position = $.ui.dialog.prototype.options.position;
			}
			
			this.iframeContainer[this.element.attr('id')]
				// workaround for jQuery bug #5781 http://dev.jquery.com/ticket/5781
				.css({ top: 0, left: 0 })
				.position($.extend({ of: window }, position));		
		}	
	});
}(jQuery));
