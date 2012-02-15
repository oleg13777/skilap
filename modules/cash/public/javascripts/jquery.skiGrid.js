(function( $ ) {
  $.fn.skiGrid = function(options) {
	 
	var options = $.extend( {
		sAjaxSource : '',
		tableHeight : 400,
		rowHeight:30,
		columnsCount:7,
		columns:[],
		editable:{}	
	}, options);
	
	var settingsContainer = {};
	
	function settings(){
		this.tableId = '';
		this.tableBodyRef = null;
		this.tableRowRef = null;		
		this.totalRowsCount = 0;
		this.jqXHR = null;		
		this.rowsLimit = 0;
		this.bodyScrollerRef = null;
		this.bodyWrapperRef = null;
		this.totalHeight=0;
		this.tablePosition=0;		
		this.sEcho = 1;		
		this.splitsColumnNum = options.columnsCount;
		this.splitButton = null;
		this.selectedRowId = 0;
		this.rowEditedData = null;
	};
	
	function init($obj){		
		var objSettings = new settings();
		wrapGrid($obj,objSettings);		
		var tableBody = $obj.find('tbody')[0];
		objSettings.tableBodyRef = $(tableBody);
		var trTemplate = $obj.find('tbody tr')[0];
		objSettings.tableRowRef = $(trTemplate);
		if(options.sAjaxSource == ''){
			showError('ajax source is undefined');
		}
		objSettings.rowsLimit = Math.round(options.tableHeight/options.rowHeight)+1;
		var jqXHR = $.ajax( {
			"url": options.sAjaxSource,
			"data":{"sEcho":objSettings.sEcho,"iColumns":options.columnsCount},		
			"dataType": "json",
			"cache": false			
		});
		jqXHR.done(function(data){
			objSettings.totalRowsCount = data.iTotalRecords;			
			objSettings.totalHeight = data.iTotalRecords*options.rowHeight;
			objSettings.bodyScrollerRef.css('height',objSettings.totalHeight+'px');
			var tablePosition = objSettings.totalHeight-objSettings.rowsLimit*options.rowHeight-2;
			objSettings.tablePosition = tablePosition;								
			var offset = objSettings.totalRowsCount - objSettings.rowsLimit;
			showGrid($obj,objSettings,offset);
			objSettings.bodyWrapperRef.scrollTop(objSettings.totalHeight);				
		}); 
		
	};
	
	function wrapGrid($obj,objSettings){
		var $gridWrapper = $('<div class="ski_gridWrapper"></div>');
		$obj.wrap($gridWrapper);
		/* add separate table for thead section */
		var $gridHeaderWrapper = $('<div class="ski_gridHeaderWrapper"></div>');
		var $gridHeader = $obj.clone();
		$gridHeader.find('tbody').remove();
		$gridHeader.removeAttr('id');
		$gridHeaderWrapper.append($gridHeader);		
		$obj.parent().prepend($gridHeaderWrapper);
		/* add scroll to table body */
		$gridBodyWrapper = $('<div class="ski_gridBodyWrapper"></div>');
		$obj.find('thead').remove();		
		$obj.wrap($gridBodyWrapper);
		var $gridBodyScroller = $('<div class="ski_gridBodyScroller"></div>');
		objSettings.bodyScrollerRef = $gridBodyScroller;
		objSettings.bodyWrapperRef = $obj.parent();
		$obj.parent().prepend($gridBodyScroller);
		$obj.css({'position':'absolute','left':'0'});
		/* add toolbox panel */
		var $toolbox = $('<div class="ski_gridToolbox"></div>');
		var $splitButton = $('<div class="ski_splitButton ski_button">Split</div>');
		objSettings.splitButton = $splitButton;
		$splitButton.on('click',function(){
			$(this).toggleClass('selected');
			handleSplitRowsShow(objSettings);
		});
		$toolbox.append($splitButton);
		$obj.parents('.ski_gridWrapper').prepend($toolbox);
		/* scroll event */
		objSettings.bodyWrapperRef.on('scroll',function(){									
			var scrollPosition = $(this).scrollTop();
			var tablePosition = scrollPosition + options.tableHeight -objSettings.rowsLimit*options.rowHeight-2;
			objSettings.tablePosition = tablePosition;				
			var offset = objSettings.totalRowsCount - objSettings.rowsLimit - Math.round((objSettings.totalHeight-scrollPosition - options.tableHeight)/options.rowHeight);
			showGrid($obj,objSettings,offset);			
		});
		
		/* column select event */		
		objSettings.bodyWrapperRef.find('tbody').on('click','td',function(){
			
			handleColumnClick($(this),objSettings);
		});
	};
	
	function showGrid($obj,objSettings,offset){		
		$obj.css('top',objSettings.tablePosition+'px');
		objSettings.sEcho++;
		var jqXHR = $.ajax( {
			"url": options.sAjaxSource,
			"data":{"sEcho":objSettings.sEcho,"iColumns":options.columnsCount,"iDisplayLength":objSettings.rowsLimit,"iDisplayStart":offset},			
			"dataType": "json",
			"cache": false				
		});
		jqXHR.done(function(data){
			/* Check that response id (sEcho) is equal last request id
			 */			
			if (data.sEcho*1 < objSettings.sEcho)
				return;
			
			console.log(data);
			clearGrid(objSettings);
			for(var i=0;i<data.aaData.length;i++){
				var tr = objSettings.tableRowRef.clone();						
				for(var j=0;j<options.columnsCount;j++){
					var td = tr.find('td')[j];
					/* set additional attributes from options */
					if(options.columns[j] && options.columns[j].attr){
						for(key in options.columns[j].attr){
							$(td).attr(key,options.columns[j].attr[key]);
						}
					}
					var tdVal = data.aaData[i][j];						
					$(td).css('height',options.rowHeight).attr('num',j).append('<div class="tdContent">'+(tdVal ? tdVal : '&nbsp;')+'</div>');
				}
				objSettings.tableBodyRef.append(tr.addClass('mainRow').attr('recordid',data.aaData[i][0]));
				/* Add splits rows 
				 * we should add one empty row at the end
				 */
				if(data.aaData[i][objSettings.splitsColumnNum]){
					var splits = data.aaData[i][objSettings.splitsColumnNum];
					var splitsLength = splits.length;
					var firstRow =true;
					for(var j=0;j<=splitsLength;j++){
						var tr = objSettings.tableRowRef.clone();
						/* fill splits rows */
						if(j < splitsLength){										
							var td = tr.find('td')[3];
							$(td).append('<div class="tdContent">'+splits[j]['path']+'</div>');
							var columnIndex = 4;
							if(splits[j]['value'] < 0){
								columnIndex = 5;
							}
							var td = tr.find('td')[columnIndex];
							$(td).append('<div class="tdContent">'+splits[j]['value']+'</div>');
						}
						/* union some cells */
						if(firstRow){
							$(tr.find('td')[0]).attr('rowspan',splitsLength+1).attr('colspan',2);
							firstRow = false;
						}
						else{
							$(tr.find('td')[0]).remove();							
							
						}
						$(tr.find('td')[1]).remove();
						tr.find('td').css('height',	options.rowHeight);
						objSettings.tableBodyRef.append(tr.addClass('splitRow invisible').attr('recordId',data.aaData[i][0]));
					}								
				}
			}			
			objSettings.tableBodyRef.find('tr.mainRow:odd').addClass('odd');
			objSettings.tableBodyRef.find('tr.mainRow:even').addClass('even');
			if(objSettings.selectedRowId){
				objSettings.tableBodyRef.find('tr.mainRow[recordid="'+objSettings.selectedRowId+'"]').addClass('selected');
			}
			handleSplitRowsShow(objSettings);											
		});
	};
	
	function clearGrid(objSettings){		
		objSettings.tableBodyRef.find('tr').remove();		
	};
	
	function handleSplitRowsShow(objSettings){
		objSettings.tableBodyRef.find('tr.splitRow').addClass('invisible');		
		if(objSettings.selectedRowId){			
			if(objSettings.splitButton.hasClass('selected')){
				objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').removeClass('invisible');
			}
			else{
				objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').addClass('invisible');
			}
		}
	}
	
	function handleColumnClick($col,objSettings){		
		if($col.hasClass('selected')){
			return false;
		}
		var oldSelecteds = $(objSettings.tableBodyRef.find('td.selected'));
		if(oldSelecteds[0]){			
			$oldSelectedTD = $(oldSelecteds[0]);
			$oldSelectedTD.removeClass('selected');
			$firstChild = $($oldSelectedTD.find('.tdContent :first-child')[0]);
			var newColumnVal = getColumnValFromControl($firstChild,objSettings);
			$firstChild.remove();
			var oldColumnVal = getColumnVal($oldSelectedTD);
			if(newColumnVal != oldColumnVal){				
				$oldSelectedTD.text(newColumnVal);
				if(!objSettings.rowEditedData.columns){
					objSettings.rowEditedData.columns = {};
				}
				objSettings.rowEditedData.columns[objSettings.colNum] = newColumnVal;
				if(options.columns[objSettings.colNum].attr 
					&& options.columns[objSettings.colNum].attr.name == "deposit"
					&& !objSettings.rowEditedData.columns[objSettings.colNum+1]){
					var withdrawalVal = getColumnVal($oldSelectedTD.next());
					objSettings.rowEditedData.columns[objSettings.colNum+1] = withdrawalVal;
				}
				if(options.columns[objSettings.colNum].attr 
					&& options.columns[objSettings.colNum].attr.name == "withdrawal"
					&& !objSettings.rowEditedData.columns[objSettings.colNum-1]){
					var depositVal = getColumnVal($oldSelectedTD.prev());
					objSettings.rowEditedData.columns[objSettings.colNum-1] = depositVal;
				}
			}			
		}		
		/* selected row changing */
		if(!$col.parent().hasClass('selected')){
			var rowEditedData = $.extend({},objSettings.rowEditedData);
			updateRow(rowEditedData,objSettings);				
			objSettings.bodyWrapperRef.find('tr.mainRow').removeClass('selected');
			$col.parent().addClass('selected');
			objSettings.selectedRowId = $col.parent().attr('recordid');	
			objSettings.rowEditedData={};
			objSettings.rowEditedData['id'] = objSettings.selectedRowId;						
			handleSplitRowsShow(objSettings);
		}									
		var colNum = $col.attr('num');
		if(!options.editable.columns || !options.editable.columns[colNum])
			return false;
			
		objSettings.colNum = colNum;		
		$col.addClass('selected');		
		var val = getColumnVal($col);
		var $element = null;
		var $secondaryElement = null;
		switch(options.editable.columns[colNum].type){
			case 'input':				
				$element = $('<input class= "ski_editable" type="text" value="'+val+'" />');
				
			break;
			case 'select':
				$element = $('<select class="ski_editable"></select');
				var jqXHR = $.ajax({
					"url": options.editable.columns[colNum].source,
					"dataType": "json",
					"cache": false				
				});
				jqXHR.done(function(data){
					for(var property in data){
						var selected = '';
						if(data[property] == val){
							selected = 'selected';
						}
						$element.append('<option value="'+data[property]+'" '+selected+'>'+data[property]+'</option>');
					}					
				});
			break;
			case 'autocomplete':
				$element = $('<input class= "ski_editable" type="text" value="'+val+'" />');
				$element.autocomplete({
					source: function(request, response){						
						var jqXHR = $.ajax({
							"url": options.editable.columns[colNum].source,
							"data":request,
							"dataType": "json",
							"cache": true				
						});
						jqXHR.done(function(data){
							response(data);
						});
					}
				});
			break;
			case 'datepicker':
				$element = $('<input style="display:block;width:100%;height:100%" type="text" value="'+val+'" readonly />');
				$element.datepicker({
					changeMonth: true,
					changeYear: true,
					showOn: "button",
					buttonImage: options.editable.columns[colNum].icon,
					buttonImageOnly: true					
				});	
				$secondaryElement = $('<img class="ski_datepicker_btn" src="'+options.editable.columns[colNum].icon+'" >');
				$secondaryElement.on('click',function(){$element.datepicker('show');});
				$wrapElement = $('<div class= "ski_editable"></div>');
				$wrapElement.append($element);
				$wrapElement.append($secondaryElement);
				$element = $wrapElement;
			break;
		}
		if($element){
			$element.css({'width':$col.width()+'px','height':$col.height()+'px'});				
			$($col.find('.tdContent')[0]).prepend($element);			
		}		
	}
	
	function getColumnVal($col){
		var $tdContent = $($col.find('.tdContent')[0]);
		return $.trim($tdContent.text());
	}
	
	function getColumnValFromControl($firstChild,objSettings){		
		var val="";
		var colNum = objSettings.colNum;
		switch(options.editable.columns[colNum].type){
			case 'input':				
			case 'select':				
			case 'autocomplete':
				val = $firstChild.val();
			break;
			case 'datepicker':
				val = $firstChild.find('input').val();
			break;
		}		
		return $.trim(val);
	}
	
	function updateRow(rowEditedData,objSettings){
		if(!rowEditedData.columns)
			return false;
		var jqXHR = $.ajax({
			"url": options.editable.sUpdateURL,
			"data":rowEditedData,
			"type":"POST",
			"dataType": "json",
			"cache": false				
		});
		jqXHR.done(function(data){
			console.log('done');
			objSettings.bodyWrapperRef.scroll();
		});
		jqXHR.fail(function(data){
			console.log('fail');
			objSettings.bodyWrapperRef.scroll();
		});
	}
	
	function showError(errorText){
		alert(errorText);
	};
      
	return this.each(function(){		
		init($(this));		
	});
  };
})( jQuery );
