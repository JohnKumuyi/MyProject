function main( request, response )
{
    var userId = nlapiGetUser();

    var subsidiary = request.getParameter('subsidiary');
    
    if (subsidiary) {
        var acctTxnList = processAcctTxn(subsidiary);
        var html = makeHtml(acctTxnList, subsidiary, userId);
        var form = makePage(html, subsidiary);
        response.writePage(form);    
    } else {
        subsidiary = '' + 2;
        var acctTxnList = processAcctTxn(subsidiary);
        var html = makeHtml(acctTxnList, subsidiary, userId);
        var form = makePage(html, subsidiary);
        response.writePage(form);
    }
}

function makePage(reportHtml, subsidiary)
{
    var form = nlapiCreateForm('ELC Account Trial Balance');
    form.setScript('customscript151');
    
    var filterGroup = form.addFieldGroup( 'filter_group', 'Report Filters');
    
    var subsidiaryFldLbl = form.addField('subsidiary_label','inlinehtml', 'Subsidiary', null, 'filter_group');
    subsidiaryFldLbl.setLayoutType('outsidebelow','startcol')
    subsidiaryFldLbl.setDefaultValue( '<div style="display: inline-flex;padding-left: 6px; font-size: 10pt;padding-right: 5px;align-items:  center; color: rgb(100,100,100);">Subsidiary</div>' );
    var subsidiaryFld = form.addField('subsidiary','select', '', null, 'filter_group');
    var subsidiaryList = populateSubsidiary();
    subsidiaryFld.addSelectOption('-10', 'Becca (Consolidated)');
    for (var i = 0; i < subsidiaryList.length; i ++)
    {
         var subsidiaryObj = subsidiaryList[i];
         subsidiaryFld.addSelectOption(subsidiaryObj.internalId, subsidiaryObj.name); //subsidiaryObj.name
    }
    subsidiaryFld.setLayoutType('outsidebelow','startcol')
    subsidiaryFld.setDefaultValue(subsidiary);
    
    var refreshBtn = form.addField('refresh_html','inlinehtml', 'Refresh', null, 'filter_group');
    refreshBtn.setLayoutType('outsidebelow','startcol')
    refreshBtn.setDefaultValue( '<div style="display: inline-flex;margin-left: 60px;padding-right: 5px;align-items:  center;color: rgb(100,100,100);"><button id="refresh_btn" style="cursor:pointer; font-size: 11pt;font-weight: bold;width: 110px;color: rgb(110, 110, 110);">Refresh</button></div>' );
    var excelExportBtn = form.addField('excel_export_html','inlinehtml', 'Excel Export', null, 'filter_group');
    excelExportBtn.setLayoutType('outsidebelow','startcol')
    excelExportBtn.setDefaultValue( '<div style="display: inline-flex;margin-left: 20px;padding-right: 5px;align-items:  center;color: rgb(100,100,100);"><button id="excel_export_btn" style="cursor:pointer; font-size: 11pt;font-weight: bold;width: 110px;color: rgb(110, 110, 110);">Excel Export</button></div>' );
    
    var mainGroup = form.addFieldGroup( 'main_group', 'ELC Trial Balance Report Data');
    var reportData = form.addField('report_data', 'inlinehtml', 'REPORT DATA', null, 'main_group');
    reportData.setDefaultValue( reportHtml );

    return form;
}

function populateSubsidiary()
{
    var subsidiaryList = [];
    var filters = [];
    filters[0] = new nlobjSearchFilter( 'isinactive', null, 'is', 'F' );

    var columns = [];
    columns[0] = new nlobjSearchColumn( 'name' );
     
    var searchresults = nlapiSearchRecord( 'subsidiary', null, filters, columns );
    if ( searchresults != null && searchresults.length > 0 ) 
    {
        for (var i = 0; i < searchresults.length; i ++)
        {
            var element = searchresults[i];
            var subsidiaryObj = new Object;
            subsidiaryObj.internalId = element.getId();
            subsidiaryObj.name = element.getValue(columns[0]);
            subsidiaryList.push(subsidiaryObj);
        }
    }

    return subsidiaryList;
}

function makeHtml(acctTxnList, subsidiary, userId)
{
    var html = "";
    html += "<style>";
    html += ".report_bold_cell{font-weight: bold}";
    html += ".report_head_cell{font-weight: normal; background-color: #e0e6ef; min-width:70px}";
    html += ".report_align_cell{padding-left: 8px; padding-right: 8px;}";
    html += ".title_row{display:none}";
    html += "</style>";
    html += "<table id='tbl_obj' style='border-collapse: collapse;'>";
    html += "<tr class='title_row' style='font-weight:bold; font-size: 14pt;'><td style='text-align:center;' colspan=5>ELC Trial Balance Report</td></tr>";
    html += "<tr style='height: 26px'>";
        html += "<td class='report_head_cell report_align_cell' style='border-right: solid 1px rgb(199, 199, 199);'>GL ACCOUNT NAME</td>";
        html += "<td class='report_head_cell report_align_cell' style='border-right: solid 1px rgb(199, 199, 199);'>SAP ACCOUNT</td>";
        html += "<td class='report_head_cell report_align_cell' style='border-right: solid 1px rgb(199, 199, 199);'>CC RULE</td>";
        html += "<td class='report_head_cell report_align_cell' style='border-right: solid 1px rgb(199, 199, 199);'>TRADING PARTNER</td>";
        html += "<td class='report_head_cell report_align_cell' style='border-right: solid 1px rgb(199, 199, 199);'>BALANCE</td>";
    html += "</tr>";
    for ( var i = 0; i < acctTxnList.length; i ++ ) {
          var element = acctTxnList[i];
          var nsAcctName = element.ns_account_name;
          var sapAcctName = element.sap_account_name;
          var ccRule = element.cc_rule;
          var tradingPartner = element.trading_partner;
          var balance = element.balance;
          var ccRuleArr = element.ccRuleArr;
 
          html += "<tr>";
              html += "<td class='report_align_cell'>" + nsAcctName + "</td>";
              html += "<td class='report_align_cell'>" + sapAcctName + "</td>";
              html += "<td class='report_align_cell'>" + ccRule + "</td>";
              html += "<td class='report_align_cell'>" + tradingPartner + "</td>";
              html += "<td class='report_align_cell'>" + addCommas(parseFloat(Math.round(balance))) + "</td>";
          html += "</tr>";
          
          for (var j = 0; j < ccRuleArr.length; j ++) {
              var ccm = ccRuleArr[j].ccm;
              var amount = ccRuleArr[j].amount;
              html += "<tr>";
                  html += "<td class='report_align_cell'>" + nsAcctName + "</td>";
                  html += "<td class='report_align_cell'>" + sapAcctName + "</td>";
                  html += "<td class='report_align_cell'>" + ccm + "</td>";
                  html += "<td class='report_align_cell'>" + tradingPartner + "</td>";
                  html += "<td class='report_align_cell'>" + addCommas(parseFloat(Math.round(amount))) + "</td>";
              html += "</tr>";
          }
    }
    html += "</table>";
            
    return html;
}

function processAcctTxn(subsidiary)
{
    var sapAcctMapList = loadSAPAcctMap(subsidiary);
    var transListObj = loadTransaction(subsidiary);

    for (var i = 0; i < sapAcctMapList.length; i ++) {
        var element = sapAcctMapList[i];
        var ns_account_id = element.ns_account_id;
        var transCCRuleArr = transListObj[ns_account_id];
        element.ccRuleArr = [];
        if (transCCRuleArr != undefined && transCCRuleArr != 'undefined') {
            element.ccRuleArr = transCCRuleArr;
        }
    }

    return sapAcctMapList;
}

function loadSAPAcctMap(subsidiary)
{
    var tmpArr = [];
 
    var filters = [];
    filters.push( new nlobjSearchFilter('subsidiary', null, 'anyof', [subsidiary]) ); 
//    filters.push( new nlobjSearchFilter('custrecord_ns_acct_vs_sap_acct', null, 'noneof', ['@NONE@']) ); 
    filters.push( new nlobjSearchFilter('balance', null, 'greaterthan', [0.00, null]) ); 
    var cols = [];
    cols.push( new nlobjSearchColumn('name', null, null) );
    cols.push( new nlobjSearchColumn('custrecord_ns_acct_vs_sap_acct', null, null) );
    cols.push( new nlobjSearchColumn('custrecord_sap_cc_rule', null, null) );
    cols.push( new nlobjSearchColumn('custrecord_account_number', 'CUSTRECORD_NS_ACCT_VS_SAP_ACCT', null) );
    cols.push( new nlobjSearchColumn('custrecord_account_name', 'CUSTRECORD_NS_ACCT_VS_SAP_ACCT', null ) );
    cols.push( new nlobjSearchColumn('custrecord_trading_partner', null, null ) );
    cols.push( new nlobjSearchColumn('balance', null, null ) );

    cols[0].setSort();
    cols[1].setSort();
    cols[2].setSort();

    var results = nlapiSearchRecord( 'account', null, filters, cols );

    if (results && results.length > 0)
    {   
    //    var cols = results[0].getAllColumns();
        for (var i = 0; i < results.length; i ++) 
        {
            var element = results[i];
            var ns_account_id = element.getId();
            var ns_account_name = element.getValue(cols[0]);
            var sap_account_id = element.getValue(cols[1]);
            var sap_account_name = element.getText(cols[1]);
            var cc_rule = element.getValue(cols[2]);
            var sap_account_number = element.getValue(cols[3]);
            var sap_account_title = element.getValue(cols[4]);
            var trading_partner = element.getValue(cols[5]);
            var balance = element.getValue(cols[6]);

            var mapKeyObj = new Object;
            mapKeyObj.ns_account_id = ns_account_id;
            mapKeyObj.ns_account_name = ns_account_name;
            mapKeyObj.sap_account_id = sap_account_id;
            mapKeyObj.sap_account_name = sap_account_name;
            mapKeyObj.sap_account_number = sap_account_number;
            mapKeyObj.sap_account_title = sap_account_title;
            mapKeyObj.cc_rule = cc_rule;
            mapKeyObj.trading_partner = trading_partner;
            mapKeyObj.balance = balance;

            tmpArr.push(mapKeyObj);
        }
    }

    return tmpArr;
}

function loadTransaction(subsidiary)
{
    var filters = [];
    filters.push( new nlobjSearchFilter('subsidiary', null, 'anyof', [subsidiary]) ); 
    filters.push( new nlobjSearchFilter('accounttype', null, 'noneof', ['@NONE@']) ); 
    filters.push( new nlobjSearchFilter('custrecord_sap_ccm', 'department', 'isnotempty', []) );
    filters.push( new nlobjSearchFilter('custrecord_sap_cc_rule', 'account', 'is', ['Various']) );

    var cols = [];
    cols.push( new nlobjSearchColumn('account', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_ccm', 'department', 'GROUP') );
    cols.push( new nlobjSearchColumn('amount', null, 'SUM') );
    
    cols[0].setSort();
    cols[1].setSort();
    cols[2].setSort();

    var transListObj = new Object;
    var oldNSAcctId = 0;
    var ccmArr = [];
    var results = nlapiSearchRecord( 'transaction', null, filters, cols );

    if (results && results.length > 0)
    {       
        for ( var i = 0; i < results.length; i++ ) {
            var element = results[i];
            var nsAccountId = element.getValue(cols[0]) * 1;
            var ccm = element.getValue(cols[1]);
            var amount = element.getValue(cols[2]) * 1;

            var transObj = new Object;
            transObj.ccm = ccm;
            transObj.amount = amount;
                
            if (nsAccountId != oldNSAcctId) {
                ccmArr = [];
            }
            ccmArr.push(transObj);
            transListObj[nsAccountId] = ccmArr;

            oldNSAcctId = nsAccountId;
        }
    }
    
    return transListObj;
}

function addCommas(nStr)
{
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    
    if (isNaN(parseInt(x1 + x2)) == false) {
                    return x1 + x2;
                } else {
                    return 0.00;
                }
}

function dLog(title, detail)
{
    nlapiLogExecution('Debug', title, detail);
}