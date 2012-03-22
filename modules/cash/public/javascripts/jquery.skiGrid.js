(function( $ ) {
  $.fn.skiGrid = function(options) {
	 
	var options = $.extend( {
		sAjaxSource : '',
		tableHeight : 400,
		rowHeight:25,
		columnsCount:7,
		columns:[],
		editable:{}	
	}, options);
	
	var settingsContainer = {};
	
	function settings(){
		this.gridWrapper = null;		
		this.tableBodyRef = null;
		this.tableRowRef = null;
		this.colContainerRef = null;		
		this.headerWrapperRef = null;
		this.bodyScrollerRef = null;
		this.bodyWrapperRef = null;		
		this.totalRowsCount = 0;				
		this.rowsLimit = 0;
		this.totalHeight=0;
		this.tablePosition=0;
		this.jqXHR = null;		
		this.sEcho = 1;			
		this.splitButton = null;
		this.selectedRowId = 0;
		this.rowEditedData = null;
		this.rowNewData = null;
		this.isNotDrawBorders = true;
		this.newTrContainer = null;		
		this.currentDate = null;
		this.isRowAdded = false;
	};
	
	function init($obj){		
		var objSettings = new settings();
		objSettings.rowNewData = {};
		objSettings.colContainerRef = $('<div class="tdContent"></div>').css('line-height',options.rowHeight+'px');
		var tableBody = $obj.find('tbody')[0];
		objSettings.tableBodyRef = $(tableBody);
		var trTemplate = $obj.find('tbody tr')[0];
		objSettings.tableRowRef = $(trTemplate);
		wrapGrid($obj,objSettings);	
		bindEvents($obj,objSettings);
			
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
			updateGridSettings(data,objSettings);							
			var offset = objSettings.totalRowsCount - objSettings.rowsLimit;
			showGrid($obj,objSettings,offset);
			objSettings.bodyWrapperRef.scrollTop(objSettings.totalHeight);				
		}); 
		
	};
	
	function updateGridSettings(data,objSettings){
		objSettings.currentDate = data.currentDate;
		objSettings.totalRowsCount = data.iTotalRecords+2;			
		objSettings.totalHeight = objSettings.totalRowsCount*options.rowHeight;
		objSettings.bodyScrollerRef.css('height',objSettings.totalHeight+'px');
		var tablePosition = objSettings.totalHeight - objSettings.rowsLimit*options.rowHeight;			
		objSettings.tablePosition = tablePosition;	
		if(objSettings.isRowAdded){
			objSettings.isRowAdded = false;
			var prevScrollPosition = objSettings.bodyWrapperRef.scrollTop();
			objSettings.bodyWrapperRef.scrollTop(prevScrollPosition + options.rowHeight);
		}
	};
	
	function wrapGrid($obj,objSettings){
		var $gridWrapper = $('<div class="ski_gridWrapper"></div>');		
		$obj.wrap($gridWrapper);
		objSettings.gridWrapper = $obj.parent();
		/* add separate table for thead section */
		var $gridHeaderWrapper = $('<div class="ski_gridHeaderWrapper"></div>');		
		var $gridHeader = $obj.clone();
		$gridHeader.find('tbody').remove();
		$gridHeader.find('th').css('height',options.rowHeight+'px').wrapInner(objSettings.colContainerRef.clone());		
		$gridHeader.removeAttr('id');
		$gridHeaderWrapper.append($gridHeader);		
		$obj.parent().prepend($gridHeaderWrapper);		
		objSettings.headerWrapperRef = $gridHeaderWrapper;
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
		$toolbox.append($splitButton);
		$obj.parents('.ski_gridWrapper').prepend($toolbox);
		/* add footer panel */
		var $gridFooterWrapper = $('<div class="ski_gridFooterWrapper"></div>');
		var $newTrContainer = $('<div class="ski_newTrContainer invisible"></div>');
		var $newTrGrid = $obj.clone();
		$newTrGrid.find('thead').remove().end().find('tbody tr').remove().end().removeAttr('id').removeAttr('style');		
		$newTrContainer.append($newTrGrid);
		objSettings.newTrContainer = $newTrContainer;
		$gridFooterWrapper.append($newTrContainer);				
		$obj.parents('.ski_gridWrapper').append($gridFooterWrapper);
		createRowForNewTransaction(objSettings);		
	};
	
	function bindEvents($obj,objSettings){
		/* split button event */
		objSettings.splitButton.on('click',function(){
			$(this).toggleClass('ski_selected');
			handleSplitRowsShow(objSettings);
			handleNewTrSplitRowsShow(objSettings);
		});
		
		/* show block for adding new transaction */
		objSettings.gridWrapper.on('GridLoad',function(){
			showNewTransactionContainer($obj,objSettings,true);							
		});		
		
		/* scroll event */
		objSettings.bodyWrapperRef.on('scroll',function(){									
			var scrollPosition = $(this).scrollTop();			
			var tablePosition = scrollPosition;
			objSettings.tablePosition = tablePosition;				
			var offset = objSettings.totalRowsCount - objSettings.rowsLimit - Math.round((objSettings.totalHeight-scrollPosition - options.tableHeight)/options.rowHeight);
			showGrid($obj,objSettings,offset);			
		});				
		/* column select event */		
		objSettings.bodyWrapperRef.find('tbody').on('click','td',function(){
			var $firstColumn = $(objSettings.tableBodyRef.find('td.ski_selected')).prev('td[name="id"]');
			handleNewTrColumnClick($firstColumn,objSettings);			
			handleColumnClick($(this),objSettings);
		});
		
		/* new transaction column select event */		
		objSettings.newTrContainer.find('tbody').on('click','td',function(){
			var $firstColumn = $(objSettings.tableBodyRef.find('td.ski_selected')).prev('td[name="id"]');
			handleColumnClick($firstColumn,objSettings);					
			handleNewTrColumnClick($(this),objSettings);
		});
		/* handle tab key */
		objSettings.gridWrapper.find('tbody').on('keypress','td',function(e){
			if(e.keyCode == 9){				
				$(this).next().click();
				if($(this).next().attr('name') == 'total'){
					triggerModifyData($(this),objSettings);					
				}
				return false;
			}
			if(e.keyCode == 13 && ($(this).attr('name') == 'deposit' || $(this).attr('name') == 'withdrawal')){
				$(this).next().click();
				triggerModifyData($(this),objSettings);	
			}			
		});
		/* handle modify data */
		objSettings.gridWrapper.on('AddRowData',function(){			
			/* before saving, we need update value for last selected column */
			var $firstCol = $(objSettings.newTrContainer.find('tr:first td:first')[0]);					
			handleNewTrColumnClick($firstCol,objSettings);
			processRowAdd(objSettings,function(err){
				if(!err){
					objSettings.rowNewData={};
					clearDataForNewTransaction(objSettings);
					objSettings.isRowAdded = true;			
					objSettings.bodyWrapperRef.scroll();					
				}
			});
		});
		
		objSettings.gridWrapper.on('DiscardRowData',function(){	
			clearDataForNewTransaction(objSettings);
		});
		
		objSettings.gridWrapper.on('UpdateRowData',function(){			
			var allRows =  objSettings.tableBodyRef.find('tr.mainRow');
			for(i=0;i<allRows.length;i++){
				var $row = $(allRows[i]);
				if($row.hasClass('ski_selected')){
					var nextIndex = i < allRows.length - 2 ? i+1 : i-1;
					$(allRows[nextIndex]).find('td[name="id"]').click();
					break;
				}
			}			
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
			
			clearGrid(objSettings);
			updateGridSettings(data,objSettings);
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
					var $tdContent = objSettings.colContainerRef.clone();
					$tdContent.html(tdVal ? tdVal : '&nbsp;');				
					$(td).css('height',options.rowHeight).attr('num',j).append($tdContent);
					if(tdVal == "-- Multiple --" && $(td).attr('name') == 'path'){
						$(td).addClass('multiple');
					}
				}
				objSettings.tableBodyRef.append(tr.addClass('mainRow').attr('recordid',data.aaData[i][0]));
				/* Add splits rows 
				 * we should add one empty row at the end
				 */
				if(data.aaData[i][options.columnsCount]){
					var splits = data.aaData[i][options.columnsCount];					
					var splitsLength = splits.length;
					var firstRow =true;
					for(var j=0;j<=splitsLength;j++){
						var $tr = objSettings.tableRowRef.clone();
						/* fill splits rows */
						var splitId = -1;
						if(j < splitsLength){	
							splitId = splits[j].id;									
							var td = $tr.find('td')[3];
							var $tdContent = objSettings.colContainerRef.clone();
							$tdContent.text(splits[j]['path']);
							$(td).append($tdContent);
							var columnIndex = 4;
							var val = splits[j]['value']
							if( val < 0){
								columnIndex = 5;
								val*=-1;
							}
							var td = $tr.find('td')[columnIndex];
							var $tdContent = objSettings.colContainerRef.clone();
							$tdContent.text(val);
							$(td).append($tdContent);
						}						
						applyColumnAttrsForSplitRow($tr,splitId,objSettings);
						objSettings.tableBodyRef.append($tr.addClass('splitRow invisible').attr('recordId',data.aaData[i][0]));
					}								
				}				
			}			
			objSettings.tableBodyRef.find('tr.mainRow:odd').addClass('odd');
			objSettings.tableBodyRef.find('tr.mainRow:even').addClass('even');
			if(objSettings.selectedRowId){
				objSettings.tableBodyRef.find('tr.mainRow[recordid="'+objSettings.selectedRowId+'"]').addClass('ski_selected');
			}
			if(objSettings.isNotDrawBorders){
				drawGridBorders($obj,objSettings);
			}
			handleSplitRowsShow(objSettings);
			objSettings.gridWrapper.trigger('GridLoad');
		});
	};
	
	/*
	 * Draw vertical and horizontal lines instead table borders
	 */
	function drawGridBorders($obj,objSettings){				
		var $vline = $('<div class="ski_vline"></div>');		
		$vline.height(options.tableHeight + options.rowHeight);
		var columnHeaders = objSettings.headerWrapperRef.find('th');
		var w=0;
		for(i=0;i<columnHeaders.length-1;i++){
			var $th = $(columnHeaders[i]);
			var $vline_tmp = $vline.clone();
			w += $th.width();
			objSettings.headerWrapperRef.append($vline_tmp.css('left',w+'px'));
		}
		var $hline = $('<div class="ski_hline"></div>');		
		$hline.width($obj.width());
		var linesCount = Math.round(options.tableHeight/options.rowHeight);
		var h=0;
		for(i=0;i<linesCount+1;i++){
			h += options.rowHeight;
			objSettings.headerWrapperRef.append($hline.clone().css('top',h+'px'));
		}
		objSettings.isNotDrawBorders = false;
	};
	
	function clearGrid(objSettings){		
		objSettings.tableBodyRef.find('tr').remove();		
	};
	
	function handleSplitRowsShow(objSettings){
		objSettings.tableBodyRef.find('tr.splitRow').addClass('invisible');		
		if(objSettings.selectedRowId){			
			if(objSettings.splitButton.hasClass('ski_selected')){
				objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').removeClass('invisible');
				showPathInMainRow(objSettings,false);
				
			}
			else{
				objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').addClass('invisible');
				showPathInMainRow(objSettings,true);
				
			}
		}
	};
	/*
	 * Show or hide path field content in main row
	 */
	function showPathInMainRow(objSettings,show){
		var $mainRow = $(objSettings.tableBodyRef.find('tr.mainRow[recordid="'+objSettings.selectedRowId+'"]')[0]);
		var $td = $mainRow.find('td[name="path"]');					
		if(show){
			$td.find('.tdContent').removeClass('invisible');
			$td.removeClass('ski_disabled');	
		}
		else{			
			$td.find('.tdContent').addClass('invisible');
			$td.addClass('ski_disabled');					
		}
	};
	
	function handleNewTrSplitRowsShow(objSettings){		
		if(objSettings.splitButton.hasClass('ski_selected')){
			showNewTrSplits(objSettings,true);
			showPathInNewMainRow(objSettings,false);
		}
		else{
			showNewTrSplits(objSettings,false);
			showPathInNewMainRow(objSettings,true);
		}
	};	
	
	function showNewTrSplits(objSettings,show,update){
		if(!update){
			update = false;
		}
		var splitRows = objSettings.newTrContainer.find('tr.splitRow');		
		var splitHeight = splitRows.length*options.rowHeight;
		var $splitRow = $(splitRows[0]);
		var h = objSettings.newTrContainer.height();		
		if(show && $splitRow.hasClass('invisible')){
			objSettings.newTrContainer.find('tr.splitRow').removeClass('invisible');
			var newHeight = h+splitHeight;
			objSettings.newTrContainer.height(newHeight);
			objSettings.newTrContainer.css("top","-"+newHeight+"px");			
		}
		else if(!show && !$splitRow.hasClass('invisible')){
			objSettings.newTrContainer.find('tr.splitRow').addClass('invisible');
			var newHeight = h-splitHeight;
			objSettings.newTrContainer.height(newHeight);
			objSettings.newTrContainer.css("top","-"+newHeight+"px");	
		}
		else if(update){
			var newHeight = h+options.rowHeight;
			objSettings.newTrContainer.height(newHeight);
			objSettings.newTrContainer.css("top","-"+newHeight+"px");
		}	
	};	
	function showPathInNewMainRow(objSettings,show){
		var $mainRow = $(objSettings.newTrContainer.find('tr.mainRow')[0]);
		var $td = $mainRow.find('td[name="path"]');					
		if(show){
			$td.find('.tdContent').removeClass('invisible');
			$td.removeClass('ski_disabled');	
		}
		else{			
			$td.find('.tdContent').addClass('invisible');
			$td.addClass('ski_disabled');					
		}
	};
	
	function handleColumnClick($col,objSettings){			
		if($col.hasClass('ski_selected') || $col.hasClass('ski_disabled')){
			return false;
		}
		var oldSelecteds = $(objSettings.tableBodyRef.find('td.ski_selected'));		
		$oldSelectedTD = null;
		if(oldSelecteds[0]){			
			$oldSelectedTD = $(oldSelecteds[0]);
			$oldSelectedTD.removeClass('ski_selected');
			$firstChild = $($oldSelectedTD.find('.tdContent :first-child')[0]);			
			var newColumnVal = getColumnValFromControl($firstChild,objSettings);
			$firstChild.remove();
			var oldColumnVal = getColumnVal($oldSelectedTD);
			if(newColumnVal != oldColumnVal){				
				$oldSelectedTD.find('.tdContent').text(newColumnVal);
				if($oldSelectedTD.parent().hasClass('mainRow')){
					/* sync split rows with main row data */
					$($oldSelectedTD.parent().next('.splitRow').next('.splitRow').find('td')[objSettings.colNum]).find('.tdContent').text(newColumnVal);						
				}
				switch(objSettings.colNum){
					case 1:
					case 2:						
						objSettings.rowEditedData[$oldSelectedTD.attr('name')] = newColumnVal;
					break;
					case 3:
					case 4:
					case 5:						
						objSettings.rowEditedData['splits']=[];
						objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').each(function(index,splitRow){
							var path = $(splitRow).find('td[name="path"] .tdContent').text();
							if(path != ""){
								var splitId = $(splitRow).attr('splitid');								
								var deposit = $(splitRow).find('td[name="deposit"] .tdContent').text();
								var withdrawal = $(splitRow).find('td[name="withdrawal"] .tdContent').text();
								var split = {'id':splitId,'path':path, 'deposit':deposit, 'withdrawal':withdrawal};
								objSettings.rowEditedData['splits'].push(split);
							}
						});						
					break;
				}	
				if($oldSelectedTD.parent().hasClass('splitRow') && !$oldSelectedTD.parent().next('.splitRow[recordid="'+objSettings.selectedRowId+'"]').length){
					var $tr = objSettings.tableRowRef.clone();
					$tr.find('td').each(function(index,element){
						$(element).css('height',options.rowHeight)
							.attr('num',index).attr('name',options.columns[index].attr['name'])
							.append((index > 2 && index < 6 && !$(element).is(':has(.tdContent)') ? objSettings.colContainerRef.clone() : ''));
					});
					$oldSelectedTD.parent().after($tr.addClass('splitRow').attr('splitid',parseInt($oldSelectedTD.parent().attr('splitid'))-1).attr('recordId',$oldSelectedTD.parent().attr('recordId')));
				}			
			}			
		}
		processRowChange($col,$oldSelectedTD,objSettings,function(err){
			if(err){
				return false;
			}
			var colNum = $col.attr('num');
			if(!options.editable.columns || !options.editable.columns[colNum])
				return false;
			
			$col.addClass('ski_selected');	
			makeColumnEditable($col,colNum,objSettings);			
		});		
	};
	
	function handleNewTrColumnClick($col,objSettings){			
		if($col.hasClass('ski_selected') || $col.hasClass('ski_disabled')){
			return false;
		}
		var oldSelecteds = $(objSettings.newTrContainer.find('td.ski_selected'));		
		$oldSelectedTD = null;
		if(oldSelecteds[0]){			
			$oldSelectedTD = $(oldSelecteds[0]);			
			$oldSelectedTD.removeClass('ski_selected');
			$firstChild = $($oldSelectedTD.find('.tdContent :first-child')[0]);			
			var newColumnVal = getColumnValFromControl($firstChild,objSettings);
			$firstChild.remove();
			var oldColumnVal = getColumnVal($oldSelectedTD);
			if(newColumnVal != oldColumnVal){				
				$oldSelectedTD.find('.tdContent').text(newColumnVal);
				if($oldSelectedTD.parent().hasClass('mainRow')){
					/* sync split rows with main row data */
					var splitRowColNum = objSettings.colNum;
					if(objSettings.colNum == 4)
						splitRowColNum = 5;
					else if(objSettings.colNum == 5)
						splitRowColNum = 4;
					$($oldSelectedTD.parent().next('.splitRow').find('td')[splitRowColNum]).find('.tdContent').text(newColumnVal);						
				}
				switch(objSettings.colNum){
					case 1:
					case 2:						
						objSettings.rowNewData[$oldSelectedTD.attr('name')] = newColumnVal;
					break;
					case 3:
					case 4:
					case 5:						
						objSettings.rowNewData['splits']=[];
						objSettings.newTrContainer.find('tr.splitRow').each(function(index,splitRow){
							var path = $(splitRow).find('td[name="path"] .tdContent').text();
							if(path != ""){
								var splitId = $(splitRow).attr('splitid');								
								var deposit = $(splitRow).find('td[name="deposit"] .tdContent').text();
								var withdrawal = $(splitRow).find('td[name="withdrawal"] .tdContent').text();
								var split = {'id':splitId,'path':path, 'deposit':deposit, 'withdrawal':withdrawal};
								objSettings.rowNewData['splits'].push(split);
							}
						});						
					break;
				}	
				if($oldSelectedTD.parent().hasClass('splitRow') && !$oldSelectedTD.parent().next('.splitRow').length){
					var $tr = objSettings.tableRowRef.clone();
					$tr.find('td').each(function(index,element){
						$(element).css('height',options.rowHeight)
							.attr('num',index).attr('name',options.columns[index].attr['name'])
							.append((index > 2 && index < 6 && !$(element).is(':has(.tdContent)') ? objSettings.colContainerRef.clone() : ''));
					});
					$oldSelectedTD.parent().after($tr.addClass('splitRow').attr('splitid',parseInt($oldSelectedTD.parent().attr('splitid'))-1).attr('recordId',$oldSelectedTD.parent().attr('recordId')));
					showNewTrSplits(objSettings,true,true);
				}			
			}			
		}
		var colNum = $col.attr('num');
		if(!options.editable.columns || !options.editable.columns[colNum])
			return false;
		
		$col.addClass('ski_selected');	
		makeColumnEditable($col,colNum,objSettings);		
	};
	
	function processRowChange($col,$oldCol,objSettings,cb){
		/* selected row changing */
		if(!$col.parent().hasClass('ski_selected') && $col.parent().hasClass('mainRow')){
			var rowEditedData = $.extend({},objSettings.rowEditedData);
			updateRow(rowEditedData,objSettings,function(err){
				if(err){
					if(err.error == 'validateError'){
						showValidateError($oldCol,err,objSettings);
					}
					cb(err);
					return false;
				}				
				objSettings.bodyWrapperRef.find('tr.mainRow').removeClass('ski_selected');
				$col.parent().addClass('ski_selected');
				objSettings.selectedRowId = $col.parent().attr('recordid');	
				objSettings.rowEditedData={};
				objSettings.rowEditedData['id'] = objSettings.selectedRowId;						
				handleSplitRowsShow(objSettings);				
				cb();
				
			});			
		}
		else{
			cb();
		}	
	};
	
	function processRowAdd(objSettings,cb){
		/* selected row changing */		
		var rowNewData = $.extend({},objSettings.rowNewData);		
		addRow(rowNewData,objSettings,function(err){
			if(err){
				if(err.error == 'validateError'){
					showNewTrValidateError(err,objSettings);
				}
				cb(err);
				return false;
			}									
			cb();
			
		});				
	};
	
	function makeColumnEditable($col,colNum,objSettings){
		if($col.hasClass('multiple'))
			return false;
		$col.find('.tdContent').removeClass('ski_validate-error');
		objSettings.colNum = parseInt(colNum);					
		var val = getColumnVal($col);
		var $element = null;		
		var $secondaryElement = null;
		switch(options.editable.columns[colNum].type){
			case 'input':				
				$element = $('<input class= "ski_editable" type="text" value="'+val+'" />');
				
			break;			
			case 'select':
				/* delete previous autocomplete popup */
				objSettings.gridWrapper.find('.ski_select_popup').remove();
				/* calculate position of autocomplete popup */
				var autocompletePos = getAutocompletePos($col,objSettings);
				$element1 = $('<input style="display:block;width:100%;height:100%" type="text" value="'+val+'" />');
				$element1.autocomplete({position:autocompletePos});
				var jqXHR = $.ajax({
					"url": options.editable.columns[colNum].source,					
					"dataType": "json",
					"cache": true				
				});
				jqXHR.done(function(data){
					var src = [];
					for(i in data){
						src.push(data[i]);
					}
					$element1.autocomplete('option','source',src);
				});
				$element2 = $('<div class="ski_select_btn"></div>');
				var popupId = 'ski_path_popup';
				//var randId = 'ski_select_popup_'+ getRandomId();				
				$element3 = $('<div id="'+popupId+'" class="ski_select_popup"></div>');					
				$wrapElement = $('<div class= "ski_editable"></div>');
				$wrapElement.append($element1);
				$wrapElement.append($element2);	
				objSettings.gridWrapper.append($element3);				
				$element = $wrapElement;
				
				$element1.autocomplete('option','appendTo','#'+popupId);
				$element1.on('autocompleteopen',function(e,ui){
					e.target.focus();
					$('#'+popupId).find('li:first a').mouseover();
					e.preventDefault();
				});
				$element2.on('click',function(){
					if($(this).hasClass('popup')){
						$(this).removeClass('popup');
						$element1.autocomplete('option','minLength',1);
						$element1.autocomplete('search','');
					}
					else{
						$(this).addClass('popup');						
						$element1.autocomplete('option','minLength',0);
						$element1.autocomplete('search','');
					}
				});		
				
			break;
			case 'autocomplete':
				var popupId = 'ski_desc_popup';
				$element3 = $('<div id="'+popupId+'" class="ski_select_popup"></div>');
				objSettings.gridWrapper.append($element3);	
				var autocompletePos = getAutocompletePos($col,objSettings);
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
					},
					appendTo:'#'+popupId,
					position: autocompletePos
				});				
				
				$element.on('autocompleteopen',function(e,ui){					
					e.target.focus();
					$('#'+popupId).find('li:first a').mouseover();
					e.preventDefault();
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
		$col.find('input').focus();		
	};
	
	function applyColumnAttrsForSplitRow($tr,splitId,objSettings){
		$tr.attr('splitid',splitId).find('td').each(function(index,element){
			$(element).css('height',options.rowHeight)
				.attr('num',index).attr('name',options.columns[index].attr['name'])
				.append((index > 2 && index < 6 && !$(element).is(':has(.tdContent)') ? objSettings.colContainerRef.clone() : ''));
		});
	};
	
	function createRowForNewTransaction(objSettings){
		var tr = objSettings.tableRowRef.clone();
		/*refactoring it! */
		for(var j=0;j<options.columnsCount;j++){
			var td = tr.find('td')[j];
			/* set additional attributes from options */
			if(options.columns[j] && options.columns[j].attr){
				for(key in options.columns[j].attr){
					$(td).attr(key,options.columns[j].attr[key]);
				}
			}					
			var $tdContent = objSettings.colContainerRef.clone();
			$tdContent.html('&nbsp;');				
			$(td).css('height',options.rowHeight).attr('num',j).append($tdContent);				
		}				
		objSettings.newTrContainer.find('tbody').append(tr.addClass('mainRow').attr('recordid',-1));
		/*for split rows */			
		for(var i=0;i<3;i++){
			var splitId = -1 - i;
			var $tr = objSettings.tableRowRef.clone();
			applyColumnAttrsForSplitRow($tr,splitId,objSettings);				
			objSettings.newTrContainer.find('tbody').append($tr.addClass('splitRow invisible').attr('recordId','new'));
		}
	};
	
	function clearDataForNewTransaction(objSettings){
		objSettings.newTrContainer.find('td[name!="date"] .tdContent').html('&nbsp;');		
	};
	
	function showNewTransactionContainer($obj,objSettings,show){		
		if(show && objSettings.newTrContainer.hasClass('invisible')){
			objSettings.newTrContainer.width($obj.width());
			objSettings.newTrContainer.find('tr td[name="date"] .tdContent').text(objSettings.currentDate);
			objSettings.newTrContainer.removeClass('invisible');
			handleNewTrSplitRowsShow(objSettings);	
		}		
	}
	
	function showValidateError($col,data,objSettings){
		for(key in data){
			if(key == 'splits'){
				for(id in data[key]){
					var split = data[key][id];
					for(field in split){
						var $tdContent;
						if(objSettings.splitButton.hasClass('ski_selected')){
							$tdContent = $(objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"][splitid="'+id+'"] td[name="'+field+'"] .tdContent')[0]);
						}
						else{
							$tdContent = $(objSettings.tableBodyRef.find('tr.mainRow[recordid="'+objSettings.selectedRowId+'"] td[name="'+field+'"] .tdContent')[0]);
						
						}
						$tdContent.addClass('ski_validate-error');						
					}
				}
			}
		}
		$("#ski_dialog-confirm" ).dialog({
			resizable: false,
			height:180,
			modal: true,
			buttons: {
				"Discard": function() {
					objSettings.bodyWrapperRef.scroll();
					$( this ).dialog( "close" );
				},
				"Correct": function() {
					$( this ).dialog( "close" );
				}
			}
		});		
	};
	
	function showNewTrValidateError(data,objSettings){		
		for(key in data){			
			if(key == 'splits'){				
				for(id in data[key]){					
					var split = data[key][id];
					for(field in split){						
						var $tdContent;
						if(objSettings.splitButton.hasClass('ski_selected')){
							$tdContent = $(objSettings.newTrContainer.find('tr.splitRow[splitid="'+id+'"] td[name="'+field+'"] .tdContent')[0]);
						}
						else{
							if(field == "deposit")
								field = "withdrawal";
							else if(field == "withdrawal")
								field = "deposit";
							$tdContent = $(objSettings.newTrContainer.find('tr.mainRow td[name="'+field+'"] .tdContent')[0]);
						
						}
						$tdContent.addClass('ski_validate-error');						
					}
				}
			}
			else{
				$tdContent = $(objSettings.newTrContainer.find('tr.mainRow td[name="'+key+'"] .tdContent')[0]);
				$tdContent.addClass('ski_validate-error');	
			}
		}
		$("#ski_dialog-confirm" ).dialog({
			resizable: false,
			height:180,
			modal: true,
			buttons: {
				"Discard": function() {					
					objSettings.gridWrapper.trigger('DiscardRowData');
					objSettings.newTrContainer.find('.ski_validate-error').removeClass('ski_validate-error');
					$( this ).dialog( "close" );
				},
				"Correct": function() {
					$( this ).dialog( "close" );
				}
			}
		});		
	};
	
	function getColumnVal($col){
		var $tdContent = $($col.find('.tdContent')[0]);
		return $.trim($tdContent.text());
	};
	
	function getColumnValFromControl($firstChild,objSettings){		
		var val="";
		var colNum = objSettings.colNum;
		switch(options.editable.columns[colNum].type){
			case 'input':							
			case 'autocomplete':
				val = $firstChild.val();
			break;
			case 'datepicker':
			case 'select':
				val = $firstChild.find('input').val();
			break;
		}		
		return $.trim(val);
	};
	
	function updateRow(rowEditedData,objSettings,cb){
		var editedDataSize = 0;
		for(key in rowEditedData){
			editedDataSize++;
		}		
		if(editedDataSize < 2){
			showPathInMainRow(objSettings,true);
			cb();
		}
		else{		
			var jqXHR = $.ajax({
				"url": options.editable.sUpdateURL,
				"data":rowEditedData,
				"type":"POST",
				"dataType": "json",
				"cache": false				
			});
			jqXHR.done(function(data){
				if(data.error){
					cb(data);
				}
				else{
					cb();
				}								
			});
			jqXHR.fail(function(data){
				var error={error:'invalidResponse'};
				cb(error);								
			});
		}
	};
	
	function addRow(rowNewData,objSettings,cb){
		var errorsCount = 0;		
		var error={error:'validateError'};
		if(!rowNewData['date'] || rowNewData['date'] == ""){
			/* check date field */
			var dateColVal = objSettings.newTrContainer.find('td[name="date"] .tdContent').text();
			if(dateColVal != ''){
				rowNewData['date'] = dateColVal;
			}else{
				error.date = 1;
				errorsCount++;
			}
		}
		if(!rowNewData['description'] || rowNewData['description'] == ""){
			error.description = 1;
			errorsCount++;
		}
		if(!rowNewData['splits']){
			error.splits = {};
			error.splits.split = {path:1,deposit:1,withdrawal:1};			
			errorsCount++;
		}			
		if(errorsCount){
			cb(error);
			return false;
		}				
		var jqXHR = $.ajax({
			"url": options.editable.sAddURL,
			"data":rowNewData,
			"type":"POST",
			"dataType": "json",
			"cache": false				
		});
		jqXHR.done(function(data){
			if(data.error){
				cb(data);
			}
			else{
				cb();
			}			
		});
		jqXHR.fail(function(data){
			var error={error:'invalidResponse'};
			cb(error);			
		});
		
	};
	
	function showError(errorText){
		alert(errorText);
	};
	
	function getRandomId(){
		var min = 1;
		var max = 10000;
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};
	
	function getAutocompletePos($col,objSettings){		
		var pos = {my:"left top",at:"left bottom"};
		var columnPos = $col.position();
		var tableHeight = objSettings.tableBodyRef.height();		
		if(columnPos.top + 250 > tableHeight || $col.parents('.ski_newTrContainer').length > 0){			
			pos = {my:"right bottom",at:"right top"};
		}	
		return pos;
	};
	
	function triggerModifyData($col,objSettings){
		if($col.parents('.newTrContainer').length > 0){			
			objSettings.gridWrapper.trigger('AddRowData');
		}
		else{
			objSettings.gridWrapper.trigger('UpdateRowData');
		}
	};
      
	return this.each(function(){		
		init($(this));		
	});
  };
})( jQuery );
