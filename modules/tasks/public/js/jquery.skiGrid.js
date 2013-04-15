(function( $ ) {
  $.fn.skiGrid = function(options) {
	 
	var options = $.extend( {
		sAjaxSource : '',
		tableHeight : 400,
		rowHeight:25,
		columnsCount:8,
		columns:[],
		editable:{}	
	}, options);
	
	var settingsContainer = {};
	
	function settings(){
		this.obj = null;
		this.gridWrapper = null;
		this.gridBodyWrapper = null;		
		this.tableBodyRef = null;
		this.tableRowRef = null;
		this.colContainerRef = null;		
		this.headerWrapperRef = null;
		this.bodyScrollerRef = null;
		this.bodyWrapperRef = null;	
		this.tableHeight = options.tableHeight;	
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
		this.currentAccount = null;
		this.isRowAdded = false;
		this.needSaveNewTr = false;
		this.accounts = null;
	};
	
	function init($obj){		
		var objSettings = new settings();
		objSettings.obj = $obj;		
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
		adaptGridHeight(objSettings);		
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
		objSettings.currentAccount = data.currentAccount;
		objSettings.totalRowsCount = data.iTotalRecords+1;	
		var totalRowsHeight = objSettings.totalRowsCount*options.rowHeight;	
		objSettings.totalHeight = objSettings.tableHeight > totalRowsHeight ? objSettings.tableHeight : totalRowsHeight;		
		objSettings.bodyScrollerRef.height(objSettings.totalHeight);
		var tablePosition = objSettings.tableHeight > totalRowsHeight ? 0 :objSettings.totalHeight - objSettings.rowsLimit*options.rowHeight;	
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
		objSettings.gridBodyWrapper = $gridBodyWrapper;			
		var $gridBodyScroller = $('<div class="ski_gridBodyScroller"></div>');
		objSettings.bodyScrollerRef = $gridBodyScroller;
		objSettings.bodyWrapperRef = $obj.parent();
		$obj.parent().prepend($gridBodyScroller);
		$obj.css({'position':'absolute','left':'0'});
		/* add toolbox panel */
		var $toolbox = $('<div class="ski_gridToolbox"></div>');
		var $splitButton = $('<div class="ski_splitButton "><input id="splitCheck" type="checkbox"/><label for="splitCheck">Split Mode</label></div>');
		objSettings.splitButton = $splitButton;	
		$gridHeaderWrapper.find('th[name="path"] .tdContent').append($splitButton);
		
		/* add footer panel */		
		var $newTrContainer = $('<div class="ski_newTrContainer"></div>');
		var $newTrGrid = $obj.clone();
		$newTrGrid.find('thead').remove().end().find('tbody tr').remove().end().removeAttr('id').removeAttr('style');		
		$newTrContainer.append($newTrGrid);
		objSettings.newTrContainer = $newTrContainer;						
		$obj.parents('.ski_gridWrapper').append($newTrContainer);
		createRowForNewTransaction(objSettings);
		createRowSettingsMenu(objSettings);
		createSplitSettingsMenu(objSettings);		
	};
	
	function bindEvents($obj,objSettings){
		/* split button event */
		objSettings.splitButton.on('click',function(){
			var active = $(this).find('input').is(':checked');
			if(active){
				$(this).addClass('ski_selected');
			}
			else{
				$(this).removeClass('ski_selected');
			}
			handleSplitRowsShow(objSettings);			
		});
		
		/* show block for adding new transaction */
		objSettings.gridWrapper.on('GridLoad',function(){
			var dateField = objSettings.newTrContainer.find('tr.mainRow td[name="date"] .tdContent').html();
			var rstateField = objSettings.newTrContainer.find('tr.mainRow td[name="rstate"] .tdContent').html();
			if(dateField == '&nbsp;'){
				objSettings.newTrContainer.find('tr.mainRow td[name="date"] .tdContent').text(objSettings.currentDate);
			}			
			if(rstateField == '&nbsp;'){
				objSettings.newTrContainer.find('tr.mainRow td[name="rstate"] .tdContent').text('n');
			}
			objSettings.rowNewData={date:objSettings.currentDate};
			handleSplitRowsShow(objSettings);						
		});		
		
		/* scroll event */
		objSettings.bodyWrapperRef.on('scroll',function(){									
			var scrollPosition = $(this).scrollTop();			
			var tablePosition = scrollPosition;
			objSettings.tablePosition = tablePosition;				
			var offset = objSettings.totalRowsCount - objSettings.rowsLimit - Math.round((objSettings.totalHeight-scrollPosition - objSettings.tableHeight)/options.rowHeight);
			showGrid($obj,objSettings,offset);			
		});	
		/* event handler for switching currency in multiple currency transactions */	
		objSettings.gridWrapper.find('tbody').on('click','.ski_currencyFlag',function(){
			handleColumnClick($($(this).parents('tr').find('td[name="total"]')[0]),objSettings);	
			var activeCurrency = $(this).text();			
			var path_currency = $($(this).parents('td')[0]).data('path_curr');
			var $depositCol = $($(this).parents('tr').find('td[name="deposit"]')[0]);
			var $withdrawalCol = $($(this).parents('tr').find('td[name="withdrawal"]')[0]);
			var activeDepositVal = '';
			var activeWithdrawalVal = '';
			if(path_currency == activeCurrency){
				$(this).text(objSettings.currentAccount.currency);
				activeDepositVal = $depositCol.attr('data-value');
				activeWithdrawalVal = $withdrawalCol.attr('data-value');				
			}
			else{				
				$(this).text(path_currency);
				activeDepositVal = $depositCol.attr('data-quantity');
				activeWithdrawalVal = $withdrawalCol.attr('data-quantity');				
			}
			$depositCol.find('.tdContent').text(activeDepositVal);
			$withdrawalCol.find('.tdContent').text(activeWithdrawalVal);	
			return false;
		});		
		/* column select event */		
		objSettings.gridWrapper.find('tbody').on('click','td',function(){			
			handleColumnClick($(this),objSettings);			
		});
		/* event handler for show/hide row settings menu */
		objSettings.gridWrapper.find('tbody').on('click','.ski_settingsLink',function(){
			if($(this).parents('.mainRow').length > 0){
				var recordId = $($(this).parents('.mainRow')[0]).attr('recordid');						
				objSettings.gridWrapper.find('tr.mainRow[recordid != "'+recordId+'"] .ski_settingsMenu').removeClass('active');
				objSettings.gridWrapper.find('tr.splitRow[recordid = "'+recordId+'"] .ski_settingsMenu').removeClass('active');
			
			}
			else if($(this).parents('.splitRow').length > 0){
				var splitId = $($(this).parents('.splitRow')[0]).attr('splitid');
				var recordId = $($(this).parents('.splitRow')[0]).attr('recordid');			
				objSettings.gridWrapper.find('tr.splitRow[splitid != "'+splitId+'"] .ski_settingsMenu').removeClass('active');
				objSettings.gridWrapper.find('tr.mainRow[recordid = "'+recordId+'"] .ski_settingsMenu').removeClass('active');
				
			}
			var pos = getAutocompletePos($(this).parent(),objSettings);
			var menuPos = {top:'5px'};
			if(pos.my == "right bottom"){
				menuPos = {bottom:'5px'};
			}
			$(this).parent().find('.ski_settingsMenu').css(menuPos).toggleClass('active');			
		});	
		
		$(document).on('click',function(e){
			if($(".ski_settingsMenu").hasClass('active') 
					&& $(e.target).closest('.ski_settingsMenu').length == 0
					&& $(e.target).closest('.settings').length == 0){				
				$(".ski_settingsMenu").removeClass('active');
			}
		});	
		
		/* event handler for click on settings menu item */
		objSettings.gridWrapper.find('tbody').on('click','.ski_settingsMenu .menuItem',function(){						
			if($(this).hasClass('delete') && $(this).hasClass('split')){
				var recordId = $(this).parents('.splitRow').attr('recordId');
				$(this).parents('.splitRow').remove();		
				objSettings.rowEditedData['splits'] = createSplitsData(objSettings.tableBodyRef,recordId);		
			}	
			else if($(this).hasClass('delete')){
				var recordId = $($(this).parents('.mainRow')[0]).attr('recordid');
				processRowDelete(recordId, objSettings,function(err){
					turnOffSplitMode(objSettings);
					handleSplitRowsShow(objSettings);		
					if(!err){								
						objSettings.bodyWrapperRef.scroll();												
					}
				});
			}	
		});				
		
		/* handle tab key */
		objSettings.gridWrapper.find('tbody').on('keypress','td',function(e){			
			if(e.keyCode == 9){
				$(this).find('input').blur();	
				var $nextCol = $(this).next();
				if($nextCol.attr('name') == 'rstate'){
					$nextCol = $nextCol.next();
				}
				var $targetColumn	= $nextCol;			
				if($nextCol.attr('name') == 'total'){
					checkToNeedSaveNewTr($(this),objSettings);
					var $targetColumn = getTargetColumnForNextRow($(this),objSettings);																
				}
				handleColumnClick($targetColumn,objSettings);				
				return false;
			}
			if(e.which == 13){				
				var $targetColumn = getTargetColumnForNextRow($(this),objSettings);	
				checkToNeedSaveNewTr($(this),objSettings);
				handleColumnClick($targetColumn,objSettings);					
				return false;
			}			
		});
		/* handle modify data */
		objSettings.gridWrapper.on('AddRowData',function(){								
			processRowAdd(objSettings,function(err){				
				handleSplitRowsShow(objSettings);		
				if(!err){					
					clearDataForNewTransaction(objSettings);
					objSettings.isRowAdded = true;			
					objSettings.bodyWrapperRef.scroll();
					$(objSettings.newTrContainer.find('tr.mainRow td')[0]).click();							
				}
			});
		});
		
		objSettings.gridWrapper.on('DiscardRowData',function(){	
			clearDataForNewTransaction(objSettings);
		});
		
		objSettings.gridWrapper.on('UpdateRowData',function(e,$col){							
			processRowUpdate(objSettings,function(err){
				if(!err){					
					handleSplitRowsShow(objSettings);	
					objSettings.bodyWrapperRef.find('tr.mainRow').removeClass('ski_selected');
					if($col){												
						objSettings.selectedRowId = $col.parent().attr('recordid');	
						objSettings.rowEditedData={};
						objSettings.rowEditedData['id'] = objSettings.selectedRowId;
						if($col.parent().hasClass('mainRow') && $col.parent().data('multisplit')*1 == 1 && !objSettings.splitButton.find('input').is(':checked')){
							objSettings.splitButton.find('input').attr('checked','checked');
							objSettings.splitButton.click();
						}
						if(objSettings.isNeedReload){							
							objSettings.isNeedReload = false;
							objSettings.editableColumn = $col;
							objSettings.bodyWrapperRef.scroll();
						}
						else{
							processColumnEditable($col,objSettings);
						}												
					}
					else{							
						objSettings.selectedRowId = 0;	
						objSettings.rowEditedData={};
					}
					if(objSettings.isNeedReload){							
						objSettings.isNeedReload = false;
						objSettings.bodyWrapperRef.scroll();
					}					
				}
			});				
		});
		
		$("body").on('accountUpdatedSuccess',function(e,data){
			getAccountsData(function(acc){
				objSettings.accounts = acc;
			});			
		});
		
		
		/* event handler for fix grid borders size when window change */
		$(window).on('resize',function(){	
			adaptGridHeight(objSettings);				
			drawGridBorders($obj,objSettings);
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
				var tr = objSettings.tableRowRef.clone().addClass('mainRow').attr('recordid',data.aaData[i]['id']).attr('data-multicurr',data.aaData[i]['multicurr']);				
				var tdList = tr.find('td');
				for(var j=0;j<tdList.length;j++){
					var $td = $(tdList[j]);
					var name = $td.attr('name');
					var tdVal = data.aaData[i][name];
					if(name == 'deposit' || name == 'withdrawal'){
						var tdQuantity = data.aaData[i][name+'_quantity'];						
						$td.attr('data-quantity',tdQuantity).attr('data-value',tdVal);	
					}
					var $tdContent = objSettings.colContainerRef.clone();
					if(name == 'settings'){
						$tdContent.append(objSettings.rowSettingsMenu.clone());
					}
					else{						
						$tdContent.html(tdVal ? tdVal : '&nbsp;');	
					}			
					$td.css('height',options.rowHeight).attr('num',j).append($tdContent);
					if(name == 'path'){
						if(data.aaData[i]['multisplit']*1 == 1){							
							$td.addClass('multiple');
						}
						else if(data.aaData[i]['path_curr']){
							$td.attr('data-path_curr',data.aaData[i]['path_curr']);
							appendCurrencySelector($td,objSettings);
						}
					}
					tr.attr('data-multisplit',data.aaData[i]['multisplit']);
					
				}			
				objSettings.tableBodyRef.append(tr);
				/* Add splits rows 
				 * we should add one empty row at the end
				 */				
				var splits = data.aaData[i]['splits'];					
				var splitsLength = splits.length;
				var firstRow =true;
				for(var j=0;j<=splitsLength;j++){
					var $tr = objSettings.tableRowRef.clone().addClass('splitRow invisible').attr('recordId',data.aaData[i]['id']);
					/* fill splits rows */
					var splitId = -1;
					var accountId = -1;
					if(j < splitsLength){	
						splitId = splits[j]._id;
						accountId = splits[j].accountId;
						var td = $tr.find('td[name="num"]')[0];
						var $tdContent = objSettings.colContainerRef.clone();
						if(splits[j].num && splits[j].num != ''){							
							$tdContent.text(splits[j]['num']);							
						}	
						else{
							$tdContent.html('&nbsp;');	
						}
						$(td).append($tdContent);	
						var td = $tr.find('td[name="description"]')[0];
						var $tdContent = objSettings.colContainerRef.clone();
						if(splits[j].description && splits[j].description != ''){							
							$tdContent.text(splits[j]['description']);							
						}	
						else{
							$tdContent.html('&nbsp;');	
						}
						$(td).append($tdContent);								
						var td = $tr.find('td[name="path"]')[0];
						var $tdContent = objSettings.colContainerRef.clone();
						$tdContent.text(splits[j]['path']);
						$(td).append($tdContent);
						if(splits[j].currency != objSettings.currentAccount.currency){
							$(td).attr('data-path_curr',splits[j].currency);
							appendCurrencySelector($(td),objSettings);							
						}
						
						var td = $tr.find('td[name="rstate"]')[0];
						var $tdContent = objSettings.colContainerRef.clone();
						$tdContent.text(splits[j]['rstate'] && splits[j]['rstate'] != "" ? splits[j]['rstate'] : 'n');
						$(td).append($tdContent);
						var columnName = 'deposit';
						var val = splits[j]['value'];
						var quantity = splits[j]['quantity']
						if( val < 0){
							columnName = 'withdrawal';
							val*=-1;
							quantity*=-1;
						}
						var td = $tr.find('td[name="'+columnName+'"]')[0];
						var $tdContent = objSettings.colContainerRef.clone();
						$tdContent.text(splits[j].currency != objSettings.currentAccount.currency ? quantity : val);
						$(td).append($tdContent);
						$(td).attr('data-quantity',quantity).attr('data-value',val);
						
						var td = $tr.find('td[name="settings"]')[0];
						var $tdContent = objSettings.colContainerRef.clone();
						$tdContent.append(objSettings.splitSettingsMenu.clone());
						$(td).append($tdContent);
					}						
					applyColumnAttrsForSplitRow($tr,splitId,accountId,objSettings);
					objSettings.tableBodyRef.append($tr);
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
			if(objSettings.editableColumn){				
				$updatedCol = $(objSettings.tableBodyRef.find('tr.mainRow[recordid="'+objSettings.editableColumn.parent().attr('recordid')+'"] td[name="'+objSettings.editableColumn.attr('name')+'"]')[0]);
				processColumnEditable($updatedCol,objSettings);
				objSettings.editableColumn = null;
			}		
		});
	};
	
	function clearGrid(objSettings){		
		objSettings.tableBodyRef.find('tr').remove();		
	};
	
	/*
	 * Draw vertical and horizontal lines instead table borders
	 */
	function drawGridBorders($obj,objSettings){	
		objSettings.gridWrapper.find('.ski_vline,.ski_hline').remove();			
		var $vline = $('<div class="ski_vline"></div>');
		var totalHeight = objSettings.tableHeight + options.rowHeight + objSettings.headerWrapperRef.height();
		$vline.height(totalHeight);
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
		var linesCount = Math.round(totalHeight/options.rowHeight);
		
		var $selectedRow = objSettings.gridWrapper.find('tr.mainRow.ski_selected');
		var top = null;		
		if($selectedRow.length > 0 && $selectedRow.parents('.ski_newTrContainer').length == 0){
			var rowPos = $selectedRow.position();
			top = rowPos.top + 50;
		}		
		var h=0;
		for(i=0;i<linesCount;i++){
			h += options.rowHeight;
			objSettings.headerWrapperRef.append($hline.clone().css('top',h+'px').addClass(top == h ? 'bold' : ''));
		}
		objSettings.isNotDrawBorders = false;
	};	
	
	function handleSplitRowsShow(objSettings){		
		handleUpdTrSplitRowsShow(objSettings);
		handleNewTrSplitRowsShow(objSettings);
		drawGridBorders(objSettings.obj,objSettings);
	};
	
	function handleUpdTrSplitRowsShow(objSettings){
		objSettings.tableBodyRef.find('tr.splitRow').addClass('invisible');		
		if(objSettings.selectedRowId){			
			if(objSettings.splitButton.hasClass('ski_selected')){
				objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').removeClass('invisible');
				var pos = objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]:last').position();
				if(pos.top > objSettings.tableHeight){					
					var currScroll = objSettings.bodyWrapperRef.scrollTop();	
					objSettings.bodyWrapperRef.scrollTop(currScroll + (pos.top - objSettings.tableHeight + options.rowHeight));
				}
				
				showPathInUpdMainRow(objSettings,false);				
			}
			else{
				objSettings.tableBodyRef.find('tr.splitRow[recordid="'+objSettings.selectedRowId+'"]').addClass('invisible');
				showPathInUpdMainRow(objSettings,true);
				
			}
		}
	};
	
	function handleNewTrSplitRowsShow(objSettings){			
		if(objSettings.splitButton.hasClass('ski_selected') && (objSettings.newTrContainer.find('tr.mainRow.ski_selected').length > 0 || objSettings.newTrContainer.find('tr.splitRow.ski_selected').length > 0)){
			var splitRows = objSettings.newTrContainer.find('tr.splitRow').removeClass('invisible');
			var margin = splitRows.length*options.rowHeight;			
			objSettings.newTrContainer.css('margin-top','-'+margin+'px');
			showPathInNewMainRow(objSettings,false);
		}
		else{			
			objSettings.newTrContainer.find('tr.splitRow').addClass('invisible');
			objSettings.newTrContainer.css('margin-top','0');
			showPathInNewMainRow(objSettings,true);
		}				
	};	
	/*
	 * Show or hide path field content in main row
	 */
	function showPathInUpdMainRow(objSettings,show){
		var $tdColumns = $(objSettings.tableBodyRef.find('tr.mainRow[recordid="'+objSettings.selectedRowId+'"] td[name="path"],tr.mainRow[recordid="'+objSettings.selectedRowId+'"] td[name="rstate"]'));
		if(show){
			$tdColumns.find('.tdContent').removeClass('invisible');
			$tdColumns.removeClass('ski_disabled');	
		}
		else{			
			$tdColumns.find('.tdContent').addClass('invisible');
			$tdColumns.addClass('ski_disabled');					
		}
		objSettings.tableBodyRef.find('tr.mainRow[recordid!="'+objSettings.selectedRowId+'"] td[name="path"],tr.mainRow[recordid!="'+objSettings.selectedRowId+'"] td[name="rstate"]').removeClass('ski_disabled').find('.tdContent').removeClass('invisible');
		objSettings.newTrContainer.find('tr.mainRow td[name="path"],tr.mainRow td[name="rstate"]').removeClass('ski_disabled').find('.tdContent').removeClass('invisible');
	
	};	
	
	
	function showPathInNewMainRow(objSettings,show){
		var $mainRow = $(objSettings.newTrContainer.find('tr.mainRow')[0]);
		var $tdColumns = $mainRow.find('td[name="path"],td[name="rstate"]');					
		if(show){
			$tdColumns.find('.tdContent').removeClass('invisible');
			$tdColumns.removeClass('ski_disabled');	
		}
		else{			
			$tdColumns.find('.tdContent').addClass('invisible');
			$tdColumns.addClass('ski_disabled');					
		}
		objSettings.tableBodyRef.find('tr.mainRow[recordid!="'+objSettings.selectedRowId+'"] td[name="path"],tr.mainRow[recordid!="'+objSettings.selectedRowId+'"] td[name="rstate"]').removeClass('ski_disabled').find('.tdContent').removeClass('invisible');
		
	};
	
	function handleColumnClick($col,objSettings){
		var $prevInput = $(objSettings.gridWrapper.find('td.ski_selected input')[0]);		
		if($prevInput && $prevInput.parents('td.account').length > 0 && !$col.hasClass('ski_selected')){
			if(objSettings.accounts){
				var currentAcc = $prevInput.val();	
				if(currentAcc != "" && !objSettings.accounts[currentAcc] && (!$col.parent().data('multisplit') ||  $col.parent().data('multisplit') && $col.parent().data('multisplit')*1 != 1)){									
					$("#ski_dialog-confirm-create-account p.text").text('The account "'+currentAcc+'" does not exist. Would you like to create it?');
					$("#ski_dialog-confirm-create-account").dialog({
						resizable: false,
						width:350,
						height:200,
						modal: true,
						buttons: {
							"Create account": function() {																							
								$(this).dialog("close");
								/* extract name from complex account name */
								var accountParts = currentAcc.split('::');
								var accName = accountParts[accountParts.length-1];
								$("#ski_createAccount").iframeContainer("open");
								$("#ski_createAccount").iframeContainer("triggerEvent",{name:'setAccountDialogData',data:{name:accName}});	
							},
							Cancel: function() {
								$(this).dialog("close");
							}
						}
					});					
					return false
				}
			}
			
		}			
		processHandleColumnClick($col,objSettings);		
	};
	
	function processHandleColumnClick($col,objSettings){
		if($col.parents('.ski_newTrContainer').length > 0){						
			handleUpdTrColumnClick(null,objSettings);
			handleNewTrColumnClick($col,objSettings);
		}
		else{			
			handleNewTrColumnClick(null,objSettings);
			handleUpdTrColumnClick($col,objSettings);			
		}
	};
	
	function handleUpdTrColumnClick($col,objSettings){			
		if($col != null && ($col.hasClass('ski_selected') || $col.hasClass('ski_disabled'))){
			return false;
		}
		processOldSelectedColumn(objSettings,false);		
		
		if($col == null || !$col.parent().hasClass('ski_selected') && $col.parent().hasClass('mainRow')){
			objSettings.gridWrapper.trigger('UpdateRowData',[$col]);			
		}
		else{
			processColumnEditable($col,objSettings);
		}			
		
	};
	
	function handleNewTrColumnClick($col,objSettings){				
		if($col != null && ($col.hasClass('ski_selected') || $col.hasClass('ski_disabled')) && !objSettings.needSaveNewTr){			
			return false;
		}		
		processOldSelectedColumn(objSettings,true);		
		if($col == null || objSettings.needSaveNewTr){
			if(!objSettings.needSaveNewTr){
				objSettings.newTrContainer.find('tr.mainRow').removeClass('ski_selected');
			}
			objSettings.needSaveNewTr = false;			
			objSettings.gridWrapper.trigger('AddRowData');			
			return false;
		}		
		processColumnEditable($col,objSettings);		
	};
	
	function processOldSelectedColumn(objSettings,newRowMode){		
		var rowsContainer = newRowMode ? objSettings.newTrContainer : objSettings.tableBodyRef;
		var oldSelecteds = rowsContainer.find('td.ski_selected');		
		$oldSelectedTD = null;		
		if(oldSelecteds[0]){			
			var rowData = newRowMode ? objSettings.rowNewData : objSettings.rowEditedData;					
			$oldSelectedTD = $(oldSelecteds[0]);
			$oldSelectedTD.removeClass('ski_selected');
			$firstChild = $($oldSelectedTD.find('.tdContent :first-child')[0]);			
			var newColumnVal = getColumnValFromControl($firstChild,objSettings);			
			$firstChild.remove();
			var oldColumnVal = getColumnVal($oldSelectedTD);
			if(newColumnVal != oldColumnVal){				
				$oldSelectedTD.find('.tdContent').text(newColumnVal);
				var oldSelectedName = $oldSelectedTD.attr('name');
				var recordId = $oldSelectedTD.parent().attr('recordid');
				if(oldSelectedName == 'path'){										
					if(objSettings.accounts[newColumnVal].currency != objSettings.currentAccount.currency){
						$oldSelectedTD.attr('data-path_curr',objSettings.accounts[newColumnVal].currency);
						appendCurrencySelector($oldSelectedTD,objSettings);											
					}							
					rowsContainer.find('tr[recordid="'+recordId+'"] td[data-quantity]').attr('data-quantity','');											
				}
				else if(oldSelectedName == 'deposit' || oldSelectedName == 'withdrawal'){
					var selectedCurrency = getSelectedCurrency($oldSelectedTD);
					if(selectedCurrency != '' && selectedCurrency != objSettings.currentAccount.currency){
						$oldSelectedTD.attr('data-quantity',newColumnVal);						
					}
					else{
						$oldSelectedTD.attr('data-value',newColumnVal);
					}
				}
				
				/* sync split rows with main row data */
				if($oldSelectedTD.parent().hasClass('mainRow')){										
					$splitRow = $(rowsContainer.find('tr.splitRow[recordid="'+recordId+'"][accountid!="'+objSettings.currentAccount._id+'"]')[0]);
					
					if(oldSelectedName == 'deposit' || oldSelectedName == 'withdrawal'){					
						var splitColumnName = oldSelectedName == 'deposit' ? 'withdrawal' : 'deposit';
						var val = $oldSelectedTD.attr('data-value');
						var quantity = $oldSelectedTD.attr('data-quantity');
						if(!quantity){
							quantity = "";
						}
						$($splitRow.find('td[name="'+oldSelectedName+'"]')[0]).find('.tdContent').text('');	
						//console.log($splitRow.find('td[name="'+splitColumnName+'"]')[0]);
						$($splitRow.find('td[name="'+splitColumnName+'"]')[0]).attr('data-value',val).attr('data-quantity',quantity).find('.tdContent').text(val);
					}
					else if(oldSelectedName != 'description' && oldSelectedName != 'num'){						
						if(oldSelectedName == 'path'){
							if(objSettings.accounts[newColumnVal].currency != objSettings.currentAccount.currency){
								$pathCol = $($splitRow.find('td[name="path"]')[0]);
								$pathCol.attr('data-path_curr',objSettings.accounts[newColumnVal].currency);
								appendCurrencySelector($pathCol,objSettings);
							}	
						}
						else if(oldSelectedName == 'rstate'){
							$splitRow = $(rowsContainer.find('tr.splitRow[recordid="'+recordId+'"][accountid="'+objSettings.currentAccount._id+'"]')[0]);
							
						}
						$($splitRow.find('td[name="'+oldSelectedName+'"]')[0]).find('.tdContent').text(newColumnVal);
					}					
				}
				/* sync main row  with split rows  data */
				else if($oldSelectedTD.parent().hasClass('splitRow')){
					if(rowsContainer.find('tr.splitRow[recordid="'+recordId+'"]').length-1 > 2){
						rowsContainer.find('tr.mainRow[recordid="'+recordId+'"] td[name="path"] .tdContent').text('--Multiple--');
					}
					else{
						if(oldSelectedName == 'path' && $oldSelectedTD.parent().attr('accountid') != objSettings.currentAccount._id){
							var $mainRowCol = $(rowsContainer.find('tr.mainRow[recordid="'+recordId+'"] td[name="path"]')[0]);
							$mainRowCol.find('.tdContent').text(newColumnVal);
							if(objSettings.accounts[newColumnVal].currency != objSettings.currentAccount.currency){
								$mainRowCol.attr('data-path_curr',objSettings.accounts[newColumnVal].currency);
								appendCurrencySelector($mainRowCol,objSettings);
							}	
					
						}
						else if(oldSelectedName == 'rstate' && $oldSelectedTD.parent().attr('accountid') == objSettings.currentAccount._id){
							rowsContainer.find('tr.mainRow[recordid="'+recordId+'"] td[name="rstate"] .tdContent').text(newColumnVal);
						}
						/* add code for sync deposit and withdrawal */
					}
				}
				switch(oldSelectedName){
					case 'date':									
						rowData[oldSelectedName] = newColumnVal;
					break;					
					case 'path':
					case 'deposit':
					case 'withdrawal':
					case 'description':	
					case 'num':	
					case 'rstate':
						if((oldSelectedName == 'description' || oldSelectedName == 'num') && $oldSelectedTD.parent().hasClass('mainRow')){
							rowData[oldSelectedName] = newColumnVal;
						}	
						else{
							rowData['splits'] = createSplitsData(rowsContainer,recordId);								
						}					
					break;
				}	
				if($oldSelectedTD.parent().hasClass('splitRow') && !$oldSelectedTD.parent().next('.splitRow[recordid="'+recordId+'"]').length){
					var $tr = objSettings.tableRowRef.clone();
					applyColumnAttrsForSplitRow($tr,parseInt($oldSelectedTD.parent().attr('splitid'))-1,null,objSettings);
					$oldSelectedTD.parent().after($tr.addClass('splitRow').attr('recordId',$oldSelectedTD.parent().attr('recordId')));
				}
			}						
		}
	};	
	
	function processRowAdd(objSettings,cb){
		/* selected row changing */		
		var rowNewData = $.extend({},objSettings.rowNewData);
		if(!rowNewData.date){
			rowNewData.date = objSettings.currentDate;
		}
		var fieldsCount = 0;
		for(i in rowNewData){
			fieldsCount++;
		}		
		if(fieldsCount <= 1){
			return false;
		}				
		addRow(rowNewData,objSettings,function(err){
			if(err){
				showNewTrValidateError(err,objSettings);				
				cb(err);
				return false;
			}									
			cb();
			
		});				
	};
	
	function processRowUpdate(objSettings,cb){		
		var rowEditedData = $.extend({},objSettings.rowEditedData);
		var isNotNeededUpdate = true;
		for(key in rowEditedData){
			if(key != 'id'){
				isNotNeededUpdate = false;
			}
		}
		if(isNotNeededUpdate){
			cb();
			return false;
		}		
		updateRow(rowEditedData,objSettings,function(err){
			if(err){
				showUpdTrValidateError(err,objSettings);				
				cb(err);
				return false;
			}					
			cb();
			
		});			
		
	};
	
	function processRowDelete(recordId, objSettings,cb){		
		deleteRow(recordId,objSettings,function(err){
			if(err){
				showError(err.error,objSettings);					
				cb(err);
				return false;
			}					
			cb();
			
		});			
		
	};
	
	function addRow(rowNewData,objSettings,cb){		
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
	
	function updateRow(rowEditedData,objSettings,cb){
		var editedDataSize = 0;
		for(key in rowEditedData){
			editedDataSize++;
		}		
		if(editedDataSize == 0){
			showPathInUpdMainRow(objSettings,true);
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
					objSettings.isNeedReload = true;
					cb();
				}								
			});
			jqXHR.fail(function(data){
				var error={error:'invalidResponse'};
				cb(error);								
			});
		}
	};
	
	function deleteRow(recordId,objSettings,cb){		
		var jqXHR = $.ajax({
			"url": options.editable.sDeleteURL,
			"data":{recordId:recordId},
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
	
	function processColumnEditable($col,objSettings){
		objSettings.gridWrapper.find('tr.ski_selected').removeClass('ski_selected');
		$col.parent().addClass('ski_selected');		
		var colNum = $col.attr('num');
		if(!options.editable.columns || !options.editable.columns[colNum])
			return false;
		
		$col.addClass('ski_selected');				
		makeColumnEditable($col,colNum,objSettings);		
		handleSplitRowsShow(objSettings);	
	};
	
	function disableEnter(e){		
		if(e.which == 13){
			e.stopPropagation();
		}
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
			case 'span':				
				var newVal = val == 'n' ? 'c' : 'n';				
				$element = $('<span class= "ski_editable" style="text-align:center;cursor:pointer;background-color:#fff;" >'+newVal+'</span>');
				$element.on('click',function(){					
					var newVal1 = $(this).text() == 'n' ? 'c' : 'n';
					$(this).text(newVal1);
				});
			break;		
			case 'select':
				/* delete previous autocomplete popup */
				objSettings.gridWrapper.find('.ski_select_popup').remove();
				/* calculate position of autocomplete popup */
				var autocompletePos = getAutocompletePos($col,objSettings);
				$element1 = $('<input style="display:block;width:100%;height:100%" type="text" value="'+val+'" />');
				$element1.autocomplete({
					position:autocompletePos,					
					close: function(e){
						setTimeout(function(){$element1.off('keypress',disableEnter);},300);						
					}		
				});
				var fillAutocomplete = function($elem,accounts){
					var src = [];
					for(key in accounts){
						src.push(key);
					}
					$elem.autocomplete('option','source',src);
				};
				if(objSettings.accounts){
					fillAutocomplete($element1,objSettings.accounts);
				}
				else{
					getAccountsData(function(data){
						objSettings.accounts = data;					
						fillAutocomplete($element1,objSettings.accounts);
					});					
				}
				$element2 = $('<div class="ski_select_btn"></div>');
				var popupId = 'ski_path_popup';							
				$element3 = $('<div id="'+popupId+'" class="ski_select_popup"></div>');					
				$wrapElement = $('<div class= "ski_editable"></div>');
				$wrapElement.append($element1);
				$wrapElement.append($element2);	
				objSettings.gridWrapper.append($element3);				
				$element = $wrapElement;
				
				$element1.autocomplete('option','appendTo','#'+popupId);
				$element1.on('autocompleteopen',function(e,ui){
					$element1.on('keypress',disableEnter);
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
					position: autocompletePos,
					open: function(e){
						$element.on('keypress',disableEnter);							
						e.target.focus();
						$('#'+popupId).find('li:first a').mouseover();
						e.preventDefault();
					},
					close: function(e){
						setTimeout(function(){$element.off('keypress',disableEnter);},300);						
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
		$col.find('input').focus();		
	};	
	
	
	function applyColumnAttrsForSplitRow($tr,splitId,accountId,objSettings){
		$tr.attr('splitid',splitId).attr('accountid',accountId).find('td').each(function(index,element){
			var elemName = $(element).attr('name');
			$(element).css('height',options.rowHeight)
				.attr('num',index)
				.append((elemName == 'num' || elemName == 'description' || elemName == 'path' || elemName == 'rstate' || elemName == 'deposit' || elemName == 'withdrawal') && !$(element).is(':has(.tdContent)') ? objSettings.colContainerRef.clone() : '');
		});
	};
	
	function appendCurrencySelector($col,objSettings){
		var currency = objSettings.currentAccount.currency;		
		if($col.parent().hasClass('splitRow')){			
			currency = $col.attr('data-path_curr');
		}
		$col.find('.tdContent').append('<a class="ski_currencyFlag" href="javascript:void(0);">'+currency+'</a>');
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
		var recordId = -1;				
		objSettings.newTrContainer.find('tbody').append(tr.addClass('mainRow').attr('recordid',recordId));
		/*for split rows */			
		for(var i=0;i<3;i++){
			var splitId = -1 - i;
			var $tr = objSettings.tableRowRef.clone();
			applyColumnAttrsForSplitRow($tr,splitId,splitId,objSettings);				
			objSettings.newTrContainer.find('tbody').append($tr.addClass('splitRow invisible').attr('recordId',recordId));
		}
	};
	
	function clearDataForNewTransaction(objSettings){
		objSettings.newTrContainer.find('td[name!="date"] .tdContent').html('&nbsp;');
		objSettings.rowNewData = {};		
	};
	
	function showUpdTrValidateError(error,objSettings){		
		$("#ski_dialog-confirm" ).dialog({
			title: error.error,
			resizable: false,
			height:180,
			modal: true,
			buttons: {
				"Discard": function() {
					objSettings.rowEditedData = {};
					objSettings.bodyWrapperRef.scroll();
					$( this ).dialog( "close" );
				},
				"Correct": function() {
					$( this ).dialog( "close" );
				}
			}
		});		
	};
	
	function showNewTrValidateError(error,objSettings){	
		
		$("#ski_dialog-confirm" ).dialog({
			title: error.error,
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
		var $tdContent = $($col.find('.tdContent')[0]).clone();
		$tdContent.children().remove();
		return $.trim($tdContent.text());
	};
	
	function getColumnValFromControl($firstChild,objSettings){		
		var val="";
		var colNum = objSettings.colNum;
		switch(options.editable.columns[colNum].type){
			case 'input':
				val = $firstChild.val();
				if($firstChild.parents('td[name="deposit"]').length > 0 || $firstChild.parents('td[name="withdrawal"]').length > 0 ){
					val = eval(val);
				}
			break;							
			case 'autocomplete':
				val = $firstChild.val();
			break;
			case 'span':
				val = $firstChild.text();
			break;
			case 'datepicker':
			case 'select':
				val = $firstChild.find('input').val();
			break;
		}		
		return $.trim(val);
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
		if($col.parents('.ski_newTrContainer').length > 0){			
			objSettings.gridWrapper.trigger('AddRowData');			
		}
		else{
			objSettings.gridWrapper.trigger('UpdateRowData',[$col]);
		}
	};
	
	function getSelectedCurrency($col){
		return $col.parents('tr').find('td[name="path"] .ski_currencyFlag').text();
	};
	
	function createRowSettingsMenu(objSettings){
		objSettings.rowSettingsMenu = $('<img class="ski_settingsLink" src= "'+options.urlPrefix+'/img/settings-icon.png" height="20px"/><div class="ski_settingsMenu"><div class="menuItem delete"><a href="javascript:void(0);">Delete Transaction</a></div></div>');
				
	};
	
	function createSplitSettingsMenu(objSettings){
		objSettings.splitSettingsMenu = $('<img class="ski_settingsLink" src= "'+options.urlPrefix+'/img/settings-icon.png" height="20px"/><div class="ski_settingsMenu"><div class="menuItem split delete"><a href="javascript:void(0);">Remove Split</a></div></div>');
				
	};
	
	function getTargetColumnForNextRow($col,objSettings){
		var nextRow = [];
		var hiddenRows = $col.parent().nextUntil(':visible');		
		if(hiddenRows.length == 0){
			nextRow = $col.parent().next();
		}
		else{
			nextRow = $(hiddenRows[hiddenRows.length-1]).next();
		}
		var colName = 'date';
		if($col.parent().hasClass('splitRow') && $col.parent().next().hasClass('splitRow')){
			colName = 'num';
		}
		var targetColumn = $($col.parent().find('td[name="'+colName+'"]')[0]);
		if(nextRow.length > 0){
			targetColumn = $(nextRow.find('td[name="'+colName+'"]')[0]);
		}
		else if($col.parents('.ski_gridBodyWrapper').length > 0){
			targetColumn = $(objSettings.newTrContainer.find('tr.mainRow td')[0]);			
		}
		return targetColumn;				
	};
	
	function checkToNeedSaveNewTr($col,objSettings){
		if($col.parents('.ski_newTrContainer').length > 0){							
			objSettings.needSaveNewTr = true;
		}		
	};
	
	function getAccountsData(cb){
		var jqXHR = $.ajax({
			"url": options.editable.columns[3].source,					
			"dataType": "json",
			"cache": true				
		});
		jqXHR.done(function(data){					
			cb(data);			
		});
	};
	
	function turnOffSplitMode(objSettings){
		objSettings.splitButton.removeClass('ski_selected');
		objSettings.splitButton.find('input').removeAttr('checked');
	};
	
	function createSplitsData(rowsContainer,recordId){
		splits=[];						
		rowsContainer.find('tr.splitRow[recordid="'+recordId+'"]').each(function(index,splitRow){
			var path = getColumnVal($(splitRow).find('td[name="path"]'));
			if(path != ""){									
				var splitId = $(splitRow).attr('splitid');
				var num = $(splitRow).find('td[name="num"] .tdContent').text();
				var description = $(splitRow).find('td[name="description"] .tdContent').text();							
				var deposit = $(splitRow).find('td[name="deposit"]').attr('data-value');
				var deposit_quantity = $(splitRow).find('td[name="deposit"]').attr('data-quantity');
				var	withdrawal = $(splitRow).find('td[name="withdrawal"]').attr('data-value');
				var	withdrawal_quantity = $(splitRow).find('td[name="withdrawal"]').attr('data-quantity');
				var rstate = $(splitRow).find('td[name="rstate"]').text();
				var split = {
					id:splitId,
					num:num,
					description:description,
					path:path, 
					rstate:rstate,
					deposit:(deposit ? deposit : ""), 
					deposit_quantity:(deposit_quantity ? deposit_quantity : ""), 
					withdrawal:(withdrawal ? withdrawal : ""),
					withdrawal_quantity:(withdrawal_quantity ? withdrawal_quantity : "")										
				};
				splits.push(split);
			}
		});	
		return splits;
	};
	
	function adaptGridHeight(objSettings){
		objSettings.tableHeight = Math.ceil(($(window).height()-160)/options.rowHeight)*options.rowHeight;
		objSettings.rowsLimit = Math.round(objSettings.tableHeight/options.rowHeight)+1;
		objSettings.obj.parents('.ski_gridBodyWrapper').height(objSettings.tableHeight);
	};	
      
	return this.each(function(){		
		init($(this));		
	});
  };
})( jQuery );
