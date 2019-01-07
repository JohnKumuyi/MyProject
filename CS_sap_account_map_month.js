$ = jQuery;
var accountPeriodList = new Object;
var sapAcctMapObj = new Object;
var departmentListObj = new Object;

$( document ).ready(function() {
    $("#fg_main_group").hide();
 //   $("#fg_filter_group").parent().parent().parent().css({"position": "fixed", "bottom": "50px"});

    $("#refresh_btn").unbind('click').bind('click', function(){
        refresh();
        return false;
    });

    $("#excel_export_btn").unbind('click').bind('click', function(){
        exportExcel();
        return false;
    });
    
    $(".left_col").unbind('click').bind('click', function(){
        var periodId = $(this).attr('periodId');
        if (periodId != undefined && periodId != 'undefined') {
            var plNumberType = $(this).parent().children('td').eq(0).text();
            openPLDetails(periodId, plNumberType);
        }
    });

    accountPeriodList = getAccountingPeriodIdList();    
    sapAcctMapObj = loadSAPAcctMap();
    departmentListObj = loadDepartment();
});

function openPLDetails(periodId, plNumberType)
{   
    var link = '';
    var userId = nlapiGetUser();
    var subsidiary = nlapiGetFieldValue('subsidiary');
    if (plNumberType == 'Gross Sales' || plNumberType == 'Net Sales' || plNumberType == 'COGS' || plNumberType == 'Inv. Step Up' || plNumberType == 'Customer List Amort' || plNumberType == 'Dep & Amor') {
        link = createPLNumberLink(periodId, plNumberType, userId, subsidiary);
    } else {
        link = createPLNumberLink_CCRule(periodId, plNumberType, userId, subsidiary);
    }
	
    window.open(link);
}

function createPLNumberLink(periodId, plNumberType, userId, subsidiary)
{
    var nsAcctArr = [];
    for (var key in sapAcctMapObj) {
        if (!sapAcctMapObj.hasOwnProperty(key)) continue;

        var obj = sapAcctMapObj[key];
        var sapAcctNum = obj.sap_acct_num * 1;
        var ccRule = obj.sap_cc_rule;

        if (plNumberType == 'Gross Sales' && sapAcctNum == 4000110) {
            nsAcctArr.push(key);    
        } else if (plNumberType == 'Net Sales' && sapAcctNum > 4000000 && sapAcctNum < 5000000) {
            nsAcctArr.push(key);
        } else if (plNumberType == 'COGS' && sapAcctNum > 5000000 && sapAcctNum < 6000000) {
            nsAcctArr.push(key);
        } else if (plNumberType == 'Inv. Step Up' && sapAcctNum == 5055005) {
            nsAcctArr.push(key);
        } else if (plNumberType == 'Customer List Amort' && sapAcctNum == 6171405) {
            nsAcctArr.push(key);
        } else if (plNumberType == 'Dep & Amor' && (sapAcctNum == 6170200 || sapAcctNum == 6170850 || sapAcctNum == 6170900 || sapAcctNum == 6171100/* || sapAcctNum == 6171405*/)) {
            nsAcctArr.push(key);
        }
    }

    var newFilters = [];
    newFilters.push(new Array('accounttype', 'noneof', '@NONE@'));
    newFilters.push('AND');
    newFilters.push(new Array('posting', 'is', 'T'));
    newFilters.push('AND');
    newFilters.push(new Array('account', 'anyof', nsAcctArr));
    newFilters.push('AND');
    if (subsidiary != -10) {
        newFilters.push(new Array('subsidiary', 'anyof', [subsidiary]));
        newFilters.push('AND');        
    }
    newFilters.push(new Array('postingperiod', 'is', periodId));
    
    var cols = [];
    cols.push( new nlobjSearchColumn('accounttype', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('account', null, 'GROUP') );
  	cols.push( new nlobjSearchColumn('custrecord_ns_acct_vs_sap_acct', 'account', 'GROUP') );
	cols.push( new nlobjSearchColumn('custrecord_sap_cc_rule', 'account', 'GROUP') );
    cols.push( new nlobjSearchColumn('department', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_ccm', 'department', 'GROUP') );
    cols.push( new nlobjSearchColumn('amount', null, 'SUM') );
    
    var searchTitle = 'P&L SAP Report by Month - ' + plNumberType;
    var searchScriptId = 'customsearch_' + getSearchId(plNumberType) + '_m_' + userId;

    try {
        var oldSearch = nlapiLoadSearch('transaction', searchScriptId);
        oldSearch.deleteSearch();
    }catch(error){
        if ( error.getDetails != undefined ) {
            dLog( "Warning", error.getCode() + ":" + error.getDetails() );
        } else {
            dLog( "Warning", error.toString() );
        }
    }
    
    var newSearch = nlapiCreateSearch('transaction', newFilters, cols);
    var searchId = newSearch.saveSearch(searchTitle, searchScriptId);
    var link = "https://system.na1.netsuite.com/app/common/search/searchresults.nl?searchid=" + searchId + "&saverun=T&whence=";

    return link;
}

function createPLNumberLink_CCRule(periodId, plNumberType, userId, subsidiary)
{
    var nsAcctArr_Various = [];
    var nsAcctArr = [];
    var nsAcctAllArr = [];
    for (var key in sapAcctMapObj) {
        if (!sapAcctMapObj.hasOwnProperty(key)) continue;

        var obj = sapAcctMapObj[key];
        var sapAcctNum = obj.sap_acct_num * 1;
        var ccRule = obj.sap_cc_rule;
        nsAcctAllArr.push(key);

        var ccOneAcctDepSubFilters = [];
        if (ccRule && ccRule != undefined && ccRule != 'undefined' && ccRule != '') {
            if (ccRule == 'Various') {
                nsAcctArr_Various.push(key);
            } else {
                if(!isNaN(ccRule)){
                   ccRule *= 1;
                }
                if (plNumberType == 'Selling' && ccRule >= 3000 && ccRule <= 3221) {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Marketing' && ccRule >= 4351 && ccRule <= 4464) {
                    nsAcctArr.push(key);    
                }
                if (plNumberType == 'Advertising' && ccRule >= 4000 && ccRule <= 4051) {
                    nsAcctArr.push(key);    
                }
                if (plNumberType == 'Promotion' && ccRule >= 4481 && ccRule <= 4492) {
                    nsAcctArr.push(key);    
                }
                if (plNumberType == 'Prodcut Development' && ccRule >= 7000 && ccRule <= 7777) {
                    nsAcctArr.push(key);    
                }
                if (plNumberType == 'Store Operations' && ccRule >= 3258 && ccRule <= 3291) {
                    nsAcctArr.push(key);        
                }
                if (plNumberType == 'Royalty Expense' && ccRule == 8700) {
                    nsAcctArr.push(key);    
                }
                if (plNumberType == 'Shipping' && ccRule >= 6003 && ccRule <= 6093) {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'General & Admin' && ccRule >= 8001 && ccRule <= 8482 && ccRule != 8066) {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Trasition Costs in Opex' && ccRule == 8066) {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Transition Costs in NonOp' && ccRule == 'TC_NONOP') {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Fair Value Amort' && ccRule == 'FV_AMORT') {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Realized (Gain)/Loss on FX' && ccRule == 'FX') {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Other Non Op - Expenses' && ccRule == 'NON_OP') {
                    nsAcctArr.push(key);
                }
                if (plNumberType == 'Tax Provision' && ccRule == 'TAX') {
                    nsAcctArr.push(key);
                }       
            }
        }
    }
    
    var depArr = [];
    for (var departmentId in departmentListObj) {
         if (!departmentListObj.hasOwnProperty(departmentId)) continue;

         var departmentObj = departmentListObj[departmentId];
         var departmentName = departmentObj.departmentName;
         var ccVal = departmentObj.ccVal;
         if (ccVal != undefined && ccVal != 'undefined') {
            if(!isNaN(ccVal)){
               ccVal *= 1;
            }
            if (plNumberType == 'Selling' && ccVal >= 3000 && ccVal <= 3221) {
                depArr.push(departmentId);    
            }
            if (plNumberType == 'Marketing' && ccVal >= 4351 && ccVal <= 4464) {
                depArr.push(departmentId);    
            }
            if (plNumberType == 'Advertising' && ccVal >= 4000 && ccVal <= 4051) {
                depArr.push(departmentId);    
            }
            if (plNumberType == 'Promotion' && ccVal >= 4481 && ccVal <= 4492) {
                depArr.push(departmentId);    
            }
            if (plNumberType == 'Prodcut Development' && ccVal >= 7000 && ccVal <= 7777) {
                depArr.push(departmentId);    
            }
            if (plNumberType == 'Store Operations' && ccVal >= 3258 && ccVal <= 3291) {
                depArr.push(departmentId);        
            }
            if (plNumberType == 'Royalty Expense' && ccVal == 8700) {
                depArr.push(departmentId);    
            }
            if (plNumberType == 'Shipping' && ccVal >= 6003 && ccVal <= 6093) {
                depArr.push(departmentId);
            }
            if (plNumberType == 'General & Admin' && ccVal >= 8001 && ccVal <= 8482 && ccVal != 8066) {
                depArr.push(departmentId);
            }
            if (plNumberType == 'Trasition Costs in Opex' && ccVal == 8066) {
                depArr.push(departmentId);
            }
            if (plNumberType == 'Transition Costs in NonOp' && ccVal == 'TC_NONOP') {
                depArr.push(departmentId);
            }
            if (plNumberType == 'Fair Value Amort' && ccVal == 'FV_AMORT') {
                depArr.push(departmentId);
            }
            if (plNumberType == 'Realized (Gain)/Loss on FX' && ccVal == 'FX') {
                depArr.push(departmentId);
            }
            if (plNumberType == 'Other Non Op - Expenses' && ccVal == 'NON_OP') {
                depArr.push(departmentId);
            }
            if (plNumberType == 'Tax Provision' && ccVal == 'TAX') {
                depArr.push(departmentId);
            }
         }
    } 

    if (nsAcctArr_Various.length == 0) {
        nsAcctArr_Various = ['@NONE@'];
    }
    if (depArr.length == 0) {
        depArr = ['@NONE@'];   
    }
    if (nsAcctArr.length == 0) {
        nsAcctArr = ['@NONE@'];
    }
    var ccFilters = [];
    ccFilters.push([new Array('account', 'anyof', nsAcctArr_Various), 'AND', new Array('department', 'anyof', depArr)]);
    ccFilters.push('OR');  
    ccFilters.push(new Array('account', 'anyof', nsAcctArr));
    
    var newFilters = [];
    newFilters.push(new Array('accounttype', 'noneof', '@NONE@'));
    newFilters.push('AND');
    newFilters.push(new Array('posting', 'is', 'T'));
    newFilters.push('AND');
    if (subsidiary != -10) {
        newFilters.push(new Array('subsidiary', 'anyof', [subsidiary]));
        newFilters.push('AND');        
    }
    if (ccFilters.length > 0) {
        newFilters.push(ccFilters);        
        newFilters.push('AND');
    }
    newFilters.push(new Array('postingperiod', 'is', periodId));
    
    var cols = [];
    cols.push( new nlobjSearchColumn('accounttype', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('account', null, 'GROUP') );
  	cols.push( new nlobjSearchColumn('custrecord_ns_acct_vs_sap_acct', 'account', 'GROUP') );
	cols.push( new nlobjSearchColumn('custrecord_sap_cc_rule', 'account', 'GROUP') );
    cols.push( new nlobjSearchColumn('department', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_ccm', 'department', 'GROUP') );
    cols.push( new nlobjSearchColumn('amount', null, 'SUM') );
    
    var searchTitle = 'P&L SAP Report by Month - ' + plNumberType;
    var searchScriptId = 'customsearch_' + getSearchId(plNumberType) + '_m_' + userId;

    try {
        var oldSearch = nlapiLoadSearch('transaction', searchScriptId);
        oldSearch.deleteSearch();
    }catch(error){
        if ( error.getDetails != undefined ) {
            dLog( "Warning", error.getCode() + ":" + error.getDetails() );
        } else {
            dLog( "Warning", error.toString() );
        }
    }
    
    dLog('newFilters', JSON.stringify(newFilters));
    var newSearch = nlapiCreateSearch('transaction', newFilters, cols);
    var searchId = newSearch.saveSearch(searchTitle, searchScriptId);
    var link = "https://system.na1.netsuite.com/app/common/search/searchresults.nl?searchid=" + searchId + "&saverun=T&whence=";

    return link;
}

function getSearchId(plNumberType)
{
    var searchIdObj = new Object;
    searchIdObj['Gross Sales'] = 'grosssale';
    searchIdObj['Net Sales'] = 'netsale';
    searchIdObj['COGS'] = 'cogs';
    searchIdObj['Inv. Step Up'] = 'invstepup';
    searchIdObj['Customer List Amort'] = 'cstlistamt';
    searchIdObj['Dep & Amor'] = 'depamor';
    searchIdObj['Selling'] = 'selling';
    searchIdObj['Marketing'] = 'marketing';
    searchIdObj['Advertising'] = 'advertising';
    searchIdObj['Promotion'] = 'promotion';
    searchIdObj['Prodcut Development'] = 'prodev';
    searchIdObj['Store Operations'] = 'storeoperat';
    searchIdObj['Royalty Expense'] = 'royaltyexp';
    searchIdObj['Shipping'] = 'shipping';
    searchIdObj['General & Admin'] = 'generaladmin';
    searchIdObj['Trasition Costs in Opex'] = 'transinopx';
    searchIdObj['Transition Costs in NonOp'] = 'transinnop';
    searchIdObj['Fair Value Amort'] = 'fairvalamt';
    searchIdObj['Realized (Gain)/Loss on FX'] = 'gainloss';
    searchIdObj['Other Non Op - Expenses'] = 'nonopexp';
    searchIdObj['Tax Provision'] = 'taxpro';

    return searchIdObj[plNumberType];
}

function getAccountingPeriodIdList()
{
    var tmpObj = new Object;

    var columns = [];
    columns[0] = new nlobjSearchColumn('periodname', null, null);
    var searchResults = nlapiSearchRecord('accountingperiod', null, null, columns);
    if (searchResults) {
        for (var i = 0; i < searchResults.length; i ++) {
            var id = searchResults[i].getId();
            var name = searchResults[i].getValue(columns[0]);
            tmpObj[name] = id;
        }
    }

    return tmpObj;
}

function loadSAPAcctMap()
{
    var tmpObj = new Object;
  	var results = nlapiSearchRecord( 'account', 'customsearch1477', null );
    if (results && results.length > 0)
    {   
        var cols = results[0].getAllColumns();
        for (var i = 0; i < results.length; i ++) 
        {
            var element = results[i];
            var ns_account = element.getId();
            var ns_account_name = element.getText(cols[0]);
            var sap_account = element.getValue(cols[1]);
            var cc_rule = element.getValue(cols[2]);
            var sap_account_number = element.getValue(cols[3]);
            var sap_account_name = element.getValue(cols[4]);

            var mapKeyObj = new Object;
            mapKeyObj.ns_acct_name = ns_account_name;
            mapKeyObj.sap_acct_id = sap_account;
            mapKeyObj.sap_acct_num = sap_account_number;
            mapKeyObj.sap_acct_name = sap_account_name;
            mapKeyObj.sap_cc_rule = cc_rule;

            tmpObj[ns_account] = mapKeyObj;
        }
    }

    return tmpObj;
}


function loadDepartment()
{
    var tmpObj = new Object;
    var filters = [];
    filters.push(new nlobjSearchFilter('custrecord_sap_ccm', null, 'isnotempty', null));

    var columns = [];
    columns.push(new nlobjSearchColumn('name'));
    columns.push(new nlobjSearchColumn('custrecord_sap_ccm'));
    
    var results = nlapiSearchRecord( 'department', null, filters, columns );
    if (results && results.length > 0)
    {   
        for (var i = 0; i < results.length; i ++) 
        {
            var element = results[i];
            var departmentId = element.getId();
            var departmentName = element.getValue(columns[0]);
            var ccVal = element.getValue(columns[1]);

            var departmentObj = new Object;
            departmentObj.departmentName = departmentName;
            departmentObj.ccVal = ccVal;
            
            tmpObj[departmentId] = departmentObj;
        }
    }

    return tmpObj;
}

function getMonthNumber(monthName)
{
    var monthArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var i = 0; i < monthArr.length; i ++){
        var tmpMonth = monthArr[i];
        if (monthName == tmpMonth) {
            return i + 1;
        }
    }
}

function refresh()
{
    var fromDate = nlapiGetFieldText('from_date');
    var toDate = nlapiGetFieldText('to_date');
    var subsidiary = nlapiGetFieldValue('subsidiary');
    
    if (!subsidiary) {
        alert('Please select subsidiary!');
    }

    if(fromDate && toDate)
    {   
        var fromArr = fromDate.split(" ");
        var fromMonthName = fromArr[0];
        var fromMonth = getMonthNumber(fromMonthName);
        var fromYear = fromArr[1];

        var toArr = toDate.split(" ");
        var toMonthName = toArr[0];
        var toMonth = getMonthNumber(toMonthName);
        var toYear = toArr[1];

        window.ischanged = false;
        var param = '&from_year=' + fromYear;
        param += '&from_month=' + fromMonth;
        param += '&to_year=' + toYear;
        param += '&to_month=' + toMonth;
        param += '&subsidiary=' + subsidiary;
        
        window.location.href = 'https://system.na1.netsuite.com/app/site/hosting/scriptlet.nl?script=141&deploy=1' + param;
    } else {
        alert('Please select correct date range!');
    }
}

function dLog(title, detail)
{
    nlapiLogExecution('Debug', title, detail);
}

var exportExcel = (function() {
    var today = new Date();
    var year = "" + today.getFullYear();
    var month = "" + (today.getMonth() * 1 + 1);
    var day = "" + today.getDate();
    var hours = "" + today.getHours();
    var minutes = "" + today.getMinutes();
    var seconds = "" + today.getSeconds();

    if (month.length == 1) {
        month = '0' + month;
    }
    if (day.length == 1) {
        day = '0' + day;
    }
    if (hours.length == 1) {
        hours = '0' + hours;
    }
    if (minutes.length == 1) {
        minutes = '0' + minutes;
    }
    if (seconds.length == 1) {
        seconds = '0' + seconds;
    }

    var tag = month + day + year.substr(2, 2) + "_" + hours + minutes + seconds;      
    var uri = 'data:application/vnd.ms-excel;base64,'
        , template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>'
        , base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) }
        , format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) }
      return function(table, name) {
        table = document.getElementById('tbl_obj')
        var ctx = {worksheet: name || 'Worksheet', table: table.innerHTML}
      //  window.location.href = uri + base64(format(template, ctx))

        var a = document.createElement('a')
        a.href =uri + base64(format(template, ctx))
        a.download = 'ELC P&L by Month_' + tag + '.xls';
        //triggering the function
        a.click();
      }
})()
