var accountPeriodList = new Object;
var sapAcctMapObj = new Object;
var departmentListObj = new Object;

function main( request, response )
{
    var fromYear = request.getParameter('from_year');
    var fromMonth = request.getParameter('from_month');
    var toYear = request.getParameter('to_year');
    var toMonth = request.getParameter('to_month');
    var subsidiary = request.getParameter('subsidiary');

    accountPeriodList = getAccountingPeriodIdList();    
    sapAcctMapObj = loadSAPAcctMap();
    departmentListObj = loadDepartment();
 
    if (fromYear && fromMonth && toYear && toMonth && subsidiary) {
        var retObj = processTxnSap(fromYear, fromMonth, toYear, toMonth, subsidiary);
        var html = processCalcAcct(retObj, fromYear, fromMonth, toYear, toMonth);
        var form = makePage(html, fromYear, fromMonth, toYear, toMonth, subsidiary);
        response.writePage(form);    
    } else {
        fromYear=2018; fromMonth=1; toYear=2018; toMonth=6; subsidiary = '' + 2;
        var retObj = processTxnSap(fromYear, fromMonth, toYear, toMonth, subsidiary);
        var html = processCalcAcct(retObj, fromYear, fromMonth, toYear, toMonth);
        var form = makePage(html, fromYear, fromMonth, toYear, toMonth, subsidiary);
        response.writePage(form);
    }
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

var monthArr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function makePage(reportHtml, fromYear, fromMonth, toYear, toMonth, subsidiary)
{
    var form = nlapiCreateForm('ELC P&L by Month Report');
    form.setScript('customscript_cs_sap_acct_gl_report_month');
    
    var filterGroup = form.addFieldGroup( 'filter_group', 'Report Filters');
    var fromDateFldLbl = form.addField('from_date_label','inlinehtml', 'From', null, 'filter_group');
    fromDateFldLbl.setLayoutType('outsidebelow','startcol')
    fromDateFldLbl.setDefaultValue( '<div style="display: inline-flex;padding-left: 5px; font-size: 10pt;padding-right: 5px;align-items:  center;color: rgb(100,100,100);">From</div>' );
    var fromDateFld = form.addField('from_date','select', '', null, 'filter_group');
    fromDateFld.setLayoutType('outsidebelow','startcol')
    fromDateFld.addSelectOption(0, "");

    var toDateFldLbl = form.addField('to_date_label','inlinehtml', 'From', null, 'filter_group');
    toDateFldLbl.setLayoutType('outsidebelow','startcol')
    toDateFldLbl.setDefaultValue( '<div style="display: inline-flex;padding-left: 30px; font-size: 10pt;padding-right: 5px;align-items:  center; color: rgb(100,100,100);">To</div>' );
    var toDateFld = form.addField('to_date','select', '', null, 'filter_group');
    toDateFld.setLayoutType('outsidebelow','startcol')
    toDateFld.addSelectOption(0, "");

    var subsidiaryFldLbl = form.addField('subsidiary_label','inlinehtml', 'Subsidiary', null, 'filter_group');
    subsidiaryFldLbl.setLayoutType('outsidebelow','startcol')
    subsidiaryFldLbl.setDefaultValue( '<div style="display: inline-flex;padding-left: 30px; font-size: 10pt;padding-right: 5px;align-items:  center; color: rgb(100,100,100);">Subsidiary</div>' );
    var subsidiaryFld = form.addField('subsidiary','select', '', null, 'filter_group');
    var subsidiaryList = populateSubsidiary();
    subsidiaryFld.addSelectOption('-10', 'Becca (Consolidated)');
    for (var i = 0; i < subsidiaryList.length; i ++)
    {
         var subsidiaryObj = subsidiaryList[i];
         subsidiaryFld.addSelectOption(subsidiaryObj.internalId, subsidiaryObj.name);
    }
    subsidiaryFld.setLayoutType('outsidebelow','startcol')
    subsidiaryFld.setDefaultValue(subsidiary);
    
    var refreshBtn = form.addField('refresh_html','inlinehtml', 'Refresh', null, 'filter_group');
    refreshBtn.setLayoutType('outsidebelow','startcol')
    refreshBtn.setDefaultValue( '<div style="display: inline-flex;margin-left: 60px;padding-right: 5px;align-items:  center;color: rgb(100,100,100);"><button id="refresh_btn" style="cursor:pointer; font-size: 11pt;font-weight: bold;width: 110px;color: rgb(110, 110, 110);">Refresh</button></div>' );
    var excelExportBtn = form.addField('excel_export_html','inlinehtml', 'Excel Export', null, 'filter_group');
    excelExportBtn.setLayoutType('outsidebelow','startcol')
    excelExportBtn.setDefaultValue( '<div style="display: inline-flex;margin-left: 20px;padding-right: 5px;align-items:  center;color: rgb(100,100,100);"><button id="excel_export_btn" style="cursor:pointer; font-size: 11pt;font-weight: bold;width: 110px;color: rgb(110, 110, 110);">Excel Export</button></div>' );
    
    var mainGroup = form.addFieldGroup( 'main_group', 'P&L Report Data');
    var reportData = form.addField('report_data', 'inlinehtml', 'REPORT DATA', null, 'main_group');
    reportData.setDefaultValue( reportHtml );

    var nowDate = new Date();
    var estDate = new Date( nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate(), nowDate.getUTCHours()-4, nowDate.getUTCMinutes(), nowDate.getUTCSeconds() );
    var lastYear = estDate.getFullYear();
    var lastMonth = estDate.getMonth();
    
    var year = 2017;
    var month = 6;
    do{
        var strOpt = getOption(year, month);
        var index = '' + year + '_' + (month * 1 + 1); 
     
        fromDateFld.addSelectOption(index, strOpt);
        toDateFld.addSelectOption(index, strOpt);
        month ++;
        if (month > 11) {
            month = 0;
            year ++;
        }
    }while(year <= lastYear)
    
    var fromDateVal = fromYear + "_"  + fromMonth;
    var toDateVal = toYear + "_"  + toMonth; 
    fromDateFld.setDefaultValue(fromDateVal);
    toDateFld.setDefaultValue(toDateVal);
    
    return form;
}

function  getOption(year, month)
{
    var quarter = 1;
 /*   if (month > 5) {
        year += 1;
    } */
    if (month >= 0 && month <= 2) {
        quarter = 3;
    } else if (month >= 3 && month <= 5) {
        quarter = 4;
    } else if (month >= 6 && month <= 6) {
        quarter = 1;
    } else if (month >= 9 && month <= 11) {
        quarter = 2;
    }

    var strPeriod = '';
    strPeriod = /*'Q' + quarter + ' ' +*/ monthArr[month] + ' ' + year;
    return strPeriod;   
}

function processTxnSap(fromYear, fromMonth, toYear, toMonth, subsidiary)
{
    var retObj = loadTransaction(fromYear, fromMonth, toYear, toMonth, subsidiary);

    var transactionList = retObj.transactionList;
    
    for (var i = 0; i < transactionList.length; i ++) {
        var element = transactionList[i];

        var nsAccountId = element.nsAccountId;
        var departmentId = element.departmentId;
        
        var mapKeyObj = sapAcctMapObj[nsAccountId];
        if (mapKeyObj != undefined && mapKeyObj != 'undefined') {
            element.ns_acct_name = mapKeyObj.ns_acct_name;
            element.sap_acct_id = mapKeyObj.sap_acct_id;
            element.sap_acct_num = mapKeyObj.sap_acct_num;
            element.sap_acct_name = mapKeyObj.sap_acct_name;
            element.sap_cc_rule = mapKeyObj.sap_cc_rule;
        }
        
        var departmentObj = departmentListObj[departmentId];
        if (departmentObj != undefined && departmentObj != 'undefined') {
            element.departmentName = departmentObj.departmentName;
            element.ccVal = departmentObj.ccVal;
        }

        transactionList[i] = element;
    }
    
    retObj.transactionList = transactionList;
    return retObj;
}

function processCalcAcct(retObj)
{
    var transactionList = retObj.transactionList;
    var glMonthList = retObj.glMonthList;

    var ccRangeObj = loadCCRange();
   
    for (var i = 0; i < glMonthList.length; i ++) {
        var element = glMonthList[i];
        element.grossSale = 0;
        element.discntAndR = 0
        element.netSale = 0;
        element.cogs = 0;
        element.invStepUp = 0;
        element.grossProfit = 0;
        element.selling = 0;
        element.marketing = 0;
        element.advertising = 0;
        element.promotion = 0;
        element.productDev = 0;
        element.storeOperation = 0;
        element.royaltyExp = 0;
        element.shipping = 0;
        element.generalAdmin = 0;
        element.contingency = 0;
        element.depAmor = 0;
        element.opex = 0;
        element.transitionCostInOpex = 0;
        element.integration = 0;
        element.controllableNop = 0;
        element.royaltyAmort = 0;
        element.customerListAmort = 0;
        element.personaAmort = 0;
        element.nop = 0;
        element.transitionCostsInNonOp = 0;
        element.fairValueAmort = 0;
        element.realizedGainLossOnFX = 0;
        element.otherNonOpExp = 0;
        element.taxProvision = 0;
        element.boi = 0;

        glMonthList[i] = element;
    }

    for (var i = 0; i < transactionList.length; i ++) {
        var element = transactionList[i];
        var sapAcctNum = element.sap_acct_num;
        var ccRule = element.sap_cc_rule;
        var ccVal = element.ccVal;
        var periodId = element.periodId;
        var amount = element.amount * 1;
        if (sapAcctNum != undefined && sapAcctNum != 'undefined') {
            sapAcctNum *= 1;
            if (sapAcctNum == 4000110) {
                glMonthList = monthCalcAcct(glMonthList, periodId, 'grossSale', amount);
            }

            if (sapAcctNum > 4000000 && sapAcctNum < 5000000) {
                glMonthList = monthCalcAcct(glMonthList, periodId, 'netSale', amount);
            }

            if (sapAcctNum > 5000000 && sapAcctNum < 6000000) {
                glMonthList = monthCalcAcct(glMonthList, periodId, 'cogs', amount);
            }

            if (sapAcctNum == 5055005) {
                glMonthList = monthCalcAcct(glMonthList, periodId, 'invStepUp', amount);
            }

            if (sapAcctNum == 6171405) {
                glMonthList = monthCalcAcct(glMonthList, periodId, 'customerListAmort', amount);
            }

            if (sapAcctNum == 6170200 || sapAcctNum == 6170850 || sapAcctNum == 6170900 || sapAcctNum == 6171100 /* || sapAcctNum == 6171405*/) {
                glMonthList = monthCalcAcct(glMonthList, periodId, 'depAmor', amount);
            }
  
        }

        if (ccRule && ccRule != undefined && ccRule != 'undefined' && ccRule != '') {
            if (ccRule != 'Various') {
                ccVal = ccRule;
            }

            if (ccVal != undefined && ccVal != 'undefined') {
                if(!isNaN(ccVal)){
                   ccVal *= 1;
                }
                if (ccVal >= 3000 && ccVal <= 3221) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'selling', amount);
                }
                if (ccVal >= 4351 && ccVal <= 4464) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'marketing', amount);
                }
                if (ccVal >= 4000 && ccVal <= 4051) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'advertising', amount);
                }
                if (ccVal >= 4481 && ccVal <= 4492) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'promotion', amount);
                }
                if (ccVal >= 7000 && ccVal <= 7777) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'productDev', amount);
                }
                if (ccVal >= 3258 && ccVal <= 3291) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'storeOperation', amount);
                }
                if (ccVal == 8700) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'royaltyExp', amount);
                }
                if (ccVal >= 6003 && ccVal <= 6093) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'shipping', amount);
                }
                if (ccVal >= 8001 && ccVal <= 8482 && ccVal != 8066) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'generalAdmin', amount);
                }
                if (ccVal == 8066) {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'transitionCostInOpex', amount);
                }
                if (ccVal == 'TC_NONOP') {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'transitionCostsInNonOp', amount);
                }
                if (ccVal == 'FV_AMORT') {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'fairValueAmort', amount);
                }
                if (ccVal == 'FX') {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'realizedGainLossOnFX', amount);
                }
                if (ccVal == 'NON_OP') {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'otherNonOpExp', amount);
                }
                if (ccVal == 'TAX') {
                    glMonthList = monthCalcAcct(glMonthList, periodId, 'taxProvision', amount);
                }
            }
        }
    }

    for (var i = 0; i < glMonthList.length; i ++) {
        var element = glMonthList[i];
        element.generalAdmin = element.generalAdmin - element.customerListAmort - element.depAmor;
        element.discntAndR = element.netSale - element.grossSale;
        element.grossProfit = element.netSale - element.cogs - element.invStepUp;
        element.opex = element.selling + element.marketing + element.advertising + element.promotion + element.productDev + element.storeOperation + element.royaltyExp + element.shipping + element.generalAdmin + element.contingency + element.depAmor;
        element.controllableNop = element.grossProfit - element.opex - element.transitionCostInOpex - element.integration;
        element.nop = element.controllableNop - (element.royaltyAmort + element.customerListAmort + element.personaAmort);
        element.boi = element.nop - (element.transitionCostsInNonOp + element.fairValueAmort + element.realizedGainLossOnFX + element.otherNonOpExp + element.taxProvision);
        glMonthList[i] = element;
    }
    
 //   return JSON.stringify(glMonthList);


    var html = "<html>";
        html += "<head>";
        html += "<script src='https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js'></script>";
        html += "<script src='https://system.na1.netsuite.com/core/media/media.nl?id=148141&c=3945539&h=86a758a1e1e98e4551fb&_xt=.js'></script>";;
        html += "<script src='https://system.na1.netsuite.com/core/media/media.nl?id=148140&c=3945539&h=7e1f359172f1f08579fb&_xt=.js'></script>";
        html += "<style>";
        html += ".report_head_cell{font-weight: normal; background-color: #e0e6ef;}";
        html += ".report_bold_cell{font-weight: bold;}";
        html += ".menu_col{white-space: nowrap;}";
        html += ".left_col{padding-left: 30px; min-width: 70px}";
        html += ".right_col{padding-left: 30px; min-width: 70px}";
        html += "</style>";
        html += "</head>";
        html += "<div style='width:1800px; height: 100%; overflow-x:auto'>";
        html += "<table id='tbl_obj' style='border-collapse: collapse;'>";
  html += "<tr><td class='report_head_cell' style='border-top: solid 3px white; border-right: solid 1px rgb(199, 199, 199); padding-left: 3px;'>FINANCIAL ROW</td>";
            for (var i = 0; i < glMonthList.length; i ++) {
                var element = glMonthList[i];
                var periodName = element.periodName;
                html += "<td  class='report_head_cell' colspan=2 style='text-align:center; border-top: solid 3px white'>" + periodName + "</td>";
            }
            html += "<td  class='report_head_cell' colspan=2 style='text-align:center; border-top: solid 3px white'>Total</td>";
        html += "</tr>";
        html += "<tr><td class='report_head_cell' style='border-right: solid 1px rgb(199, 199, 199);'></td>";
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='report_head_cell left_col'>$ ['000]</td><td class='report_head_cell right_col'>%</td>";
                }
            html += "<td class='report_head_cell left_col'>$ ['000]</td><td class='report_head_cell right_col'>%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Gross Sales</td>";
                var grossSale = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.grossSale))) + "</td><td></td>";
                    grossSale += Math.round(element.grossSale);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(grossSale))) + "</td><td></td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Discount & Returns</td>";
                var discntAndR = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(element.discntAndR))) + "</td><td></td>";
                    discntAndR += Math.round(element.discntAndR);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(discntAndR))) + "</td><td></td>";
        html += "</tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell menu_col'>Net Sales</td>";
                var netSale = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.netSale))) + "</td><td></td>";
                    netSale += Math.round(element.netSale);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(netSale))) + "</td><td></td>";
        html += "</tr>";
        html += "<tr><td>&nbsp;</td></tr>";
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td>&nbsp;</td><td>&nbsp;</td>";
                }
                html += "<td>&nbsp;</td><td>&nbsp;</td>";
        html += "<tr><td class='menu_col'>COGS</td>";
                var cogs = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.cogs))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.cogs*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    cogs += Math.round(element.cogs);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(cogs))) +"</td><td class='right_col'>" + addCommas(parseFloat(cogs*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Inv. Step Up</td>";
                var invStepUp = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.invStepUp)))  +"</td><td class='right_col'>" + addCommas(parseFloat(element.invStepUp*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    invStepUp += Math.round(element.invStepUp);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(invStepUp)))  +"</td><td class='right_col'>" + addCommas(parseFloat(invStepUp*1 / element.netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell menu_col'>Gross Profit</td>";
                var grossProfit = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(element.grossProfit))) +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(element.grossProfit*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    grossProfit += Math.round(element.grossProfit);
                }
                html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(grossProfit))) +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(grossProfit*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td>&nbsp;</td>";
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td></td><td></td>";
                }    
        html += "</tr>";
        html += "<tr><td class='menu_col'>Selling</td>";
                var selling = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.selling))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.selling*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    selling += Math.round(element.selling);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(selling))) +"</td><td class='right_col'>" + addCommas(parseFloat(selling*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Marketing</td>";
                var marketing = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.marketing))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.marketing*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    marketing += Math.round(element.marketing);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(marketing))) +"</td><td class='right_col'>" + addCommas(parseFloat(marketing*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Advertising</td>";
                var advertising = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                     html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.advertising))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.advertising*1 / element.netSale * 100).toFixed(1)) + "%</td>";  
                     advertising += Math.round(element.advertising);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(advertising))) +"</td><td class='right_col'>" + addCommas(parseFloat(advertising*1 /netSale * 100).toFixed(1)) + "%</td>";  
        html += "</tr>";
        html += "<tr><td class='menu_col'>Promotion</td>";
                var promotion = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.promotion))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.promotion*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    promotion += Math.round(element.promotion);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(promotion))) +"</td><td class='right_col'>" + addCommas(parseFloat(promotion*1 /netSale * 100).toFixed(1)) + "%</td>"; 
        html += "</tr>";
        html += "<tr><td class='menu_col'>Prodcut Development</td>";
                var productDev = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.productDev))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.productDev*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    productDev += Math.round(element.productDev);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(productDev))) +"</td><td class='right_col'>" + addCommas(parseFloat(productDev*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Store Operations</td>";
                var storeOperation = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.storeOperation))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.storeOperation*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    storeOperation += Math.round(element.storeOperation);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(storeOperation))) +"</td><td class='right_col'>" + addCommas(parseFloat(storeOperation*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Royalty Expense</td>";
                var royaltyExp = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.royaltyExp))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.royaltyExp*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    royaltyExp += Math.round(element.royaltyExp);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(royaltyExp))) +"</td><td class='right_col'>" + addCommas(parseFloat(royaltyExp*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Shipping</td>";
                var shipping = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.shipping))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.shipping*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    shipping += Math.round(element.shipping);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(shipping))) +"</td><td class='right_col'>" + addCommas(parseFloat(shipping*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>General & Admin</td>";
                var generalAdmin = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.generalAdmin))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.generalAdmin*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    generalAdmin += Math.round(element.generalAdmin);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(generalAdmin))) +"</td><td class='right_col'>" + addCommas(parseFloat(generalAdmin*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Contigency</td>";
                var contingency = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(element.contingency))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.contingency*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    contingency += Math.round(element.contingency);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(contingency))) +"</td><td class='right_col'>" + addCommas(parseFloat(contingency*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Dep & Amor</td>";
                var depAmor = 0;
                for (var i = 0; i < glMonthList.length; i++ ) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.depAmor))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.depAmor*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    depAmor += Math.round(element.depAmor);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(depAmor))) +"</td><td class='right_col'>" + addCommas(parseFloat(depAmor*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Opex</td>";
                var opex = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(element.opex))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.opex*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    opex += Math.round(element.opex);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(opex))) +"</td><td class='right_col'>" + addCommas(parseFloat(opex*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Trasition Costs in Opex</td>";
                var transitionCostInOpex = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.transitionCostInOpex))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.transitionCostInOpex*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    transitionCostInOpex += element.transitionCostInOpex;
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(transitionCostInOpex))) +"</td><td class='right_col'>" + addCommas(parseFloat(transitionCostInOpex*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Integration</td>";
                var integration = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(element.integration))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.integration*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    integration += Math.round(element.integration);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(integration))) +"</td><td class='right_col'>" + addCommas(parseFloat(integration*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell menu_col'>Controllable NOP</td>";
                var controllableNop = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(element.controllableNop))) +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(element.controllableNop*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    controllableNop += Math.round(element.controllableNop);
                }
                html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(controllableNop))) +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(controllableNop*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td>&nbsp;</td>";
                for (var i = 0; i < glMonthList.length; i++){
                    var element = glMonthList[i];
                    html += "<td class='left_col'>&nbsp;</td>";            
                }
        html += "</tr>";
        html += "<tr><td class='menu_col'>Royalty Amort</td>";
                var royaltyAmort = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(element.royaltyAmort))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.royaltyAmort*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    royaltyAmort += Math.round(element.royaltyAmort);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(royaltyAmort))) +"</td><td class='right_col'>" + addCommas(parseFloat(royaltyAmort*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Customer List Amort</td>";
                var customerListAmort = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.customerListAmort)))  +"</td><td class='right_col'>" + addCommas(parseFloat(element.customerListAmort*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    customerListAmort += Math.round(element.customerListAmort);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(customerListAmort))) +"</td><td class='right_col'>" + addCommas(parseFloat(customerListAmort*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Persona Amort</td>";
                var personaAmort = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(element.personaAmort)))  +"</td><td class='right_col'>" + addCommas(parseFloat(element.personaAmort*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    personaAmort += Math.round(element.personaAmort);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(personaAmort)))  +"</td><td class='right_col'>" + addCommas(parseFloat(personaAmort*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell menu_col'>NOP</td>";
                var nop = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(element.nop))) +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(element.nop*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    nop += Math.round(element.nop);
                }
                html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(nop))) +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(nop*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td>&nbsp;</td>";
                for (var i = 0; i < glMonthList.length; i++ ) {
                    var element = glMonthList[i];
                    html += "<td>&nbsp;</td>";
                }
        html += "</tr>";
        html += "<tr><td class='menu_col'>Transition Costs in NonOp</td>";
                var transitionCostsInNonOp = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.transitionCostsInNonOp))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.transitionCostsInNonOp*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    transitionCostsInNonOp += Math.round(element.transitionCostsInNonOp);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(transitionCostsInNonOp))) +"</td><td class='right_col'>" + addCommas(parseFloat(transitionCostsInNonOp*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Fair Value Amort</td>";
                var fairValueAmort = 0;
                for (var i = 0; i < glMonthList.length; i++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.fairValueAmort)))  +"</td><td class='right_col'>" + addCommas(parseFloat(element.fairValueAmort*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    fairValueAmort += Math.round(element.fairValueAmort);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(fairValueAmort)))  +"</td><td class='right_col'>" + addCommas(parseFloat(fairValueAmort*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Realized (Gain)/Loss on FX</td>";
                var realizedGainLossOnFX = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                     html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.realizedGainLossOnFX)))  +"</td><td class='right_col'>" + addCommas(parseFloat(element.realizedGainLossOnFX * 1 / element.netSale * 100).toFixed(1)) + "%</td>";
                     realizedGainLossOnFX += Math.round(element.realizedGainLossOnFX);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(realizedGainLossOnFX)))  +"</td><td class='right_col'>" + addCommas(parseFloat(realizedGainLossOnFX * 1 / netSale * 100).toFixed(1)) + "%</td>";   
        html += "</tr>";
        html += "<tr><td class='menu_col'>Other Non Op - Expenses</td>";
                var otherNonOpExp = 0;
                for (var i = 0; i < glMonthList.length; i++ ) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.otherNonOpExp))) +"</td><td class='right_col'>" + addCommas(parseFloat(element.otherNonOpExp*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    otherNonOpExp += Math.round(element.otherNonOpExp);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(otherNonOpExp))) +"</td><td class='right_col'>" + addCommas(parseFloat(otherNonOpExp*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr><td class='menu_col'>Tax Provision</td>";
                var taxProvision = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='left_col' periodId=" + element.periodId + ">$" + addCommas(parseFloat(Math.round(element.taxProvision)))  +"</td><td class='right_col'>" + addCommas(parseFloat(element.taxProvision*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    taxProvision += Math.round(element.taxProvision);
                }
                html += "<td class='left_col'>$" + addCommas(parseFloat(Math.round(taxProvision)))  +"</td><td class='right_col'>" + addCommas(parseFloat(taxProvision*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell menu_col'>BOI</td>";
                var boi = 0;
                for (var i = 0; i < glMonthList.length; i ++) {
                    var element = glMonthList[i];
                    html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(element.boi)))  +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(element.boi*1 / element.netSale * 100).toFixed(1)) + "%</td>";
                    boi += Math.round(element.boi);
                }
                html += "<td class='report_bold_cell left_col'>$" + addCommas(parseFloat(Math.round(boi)))  +"</td><td class='report_bold_cell right_col'>" + addCommas(parseFloat(boi*1 / netSale * 100).toFixed(1)) + "%</td>";
        html += "</tr>";
    html += "</table>";
    html += "</div>";
    html += "</html>";
    
    return html;
}

function monthCalcAcct(glMonthList, periodId, acctName, amount)
{
    for (var k = 0; k < glMonthList.length; k++) {
        var tmpPeriodId = glMonthList[k].periodId;
        if (tmpPeriodId == periodId) {
            glMonthList[k][acctName] += amount;
            break;
        }
    }

    return glMonthList;
}

function loadSAPAcctMap()
{
    var tmpObj = new Object;
    var filter = new nlobjSearchFilter('custrecord_ns_acct_vs_sap_acct', null, 'noneof', ['@NONE@']); 
    var cols = [];
    cols.push( new nlobjSearchColumn('name', null, null) );
    cols.push( new nlobjSearchColumn('custrecord_ns_acct_vs_sap_acct', null, null) );
    cols.push( new nlobjSearchColumn('custrecord_sap_cc_rule', null, null) );
    cols.push( new nlobjSearchColumn('custrecord_account_number', 'CUSTRECORD_NS_ACCT_VS_SAP_ACCT', null) );
    cols.push( new nlobjSearchColumn('custrecord_account_name', 'CUSTRECORD_NS_ACCT_VS_SAP_ACCT', null ) );

    var results = nlapiSearchRecord( 'account', null, filter, cols );
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

function loadTransaction(fromYear, fromMonth, toYear, toMonth, subsidiary)
{
    var glMonthList = [];
    var subFilters = [];
    var year = fromYear;
    var month = fromMonth;
    var periodCount = 0;
    do{
        var strPeriod = monthArr[month - 1] + ' ' + year;
        var periodId = accountPeriodList[strPeriod];

        if (periodCount < 12) {
            var periodObj = new Object;
            periodObj.periodId = periodId;
            periodObj.periodName = strPeriod;
            glMonthList.push(periodObj);    
        }
        periodCount ++;

        if (periodId != undefined && periodId != 'undefined') {
            subFilters.push(new Array('postingperiod', 'abs', [periodId]));    
            subFilters.push('OR');    
        }
        month ++;
        if (year < toYear) {
            if (month > 12) {
                month = 1;
                year ++;
            }
        } else {
            if (month > toMonth) {
                break;
            }
        }
    }while(year <= toYear)


    if (subFilters.length > 1) {
        subFilters.pop();
    }
    
    var newFilters = [];
    newFilters.push(new Array('accounttype', 'noneof', ['@NONE@']));
    newFilters.push('AND');
    newFilters.push(new Array('posting', 'is', ['T']));
    newFilters.push('AND');
//    newFilters.push(new Array('account', 'anyof', [54]));
//    newFilters.push('AND');
//    newFilters.push(new Array('accounttype', 'anyof', ['Income']));
//    newFilters.push('AND');
     if (subsidiary != -10) {
        newFilters.push(new Array('subsidiary', 'anyof', [subsidiary]));
        newFilters.push('AND');        
    }
 /*   newFilters.push(new Array('subsidiary', 'anyof', [2]));
    newFilters.push('AND');*/

    newFilters.push(subFilters);
    
    var cols = [];
    cols[0] = new nlobjSearchColumn('accounttype', null, 'GROUP');
    cols[1] = new nlobjSearchColumn('account', null, 'GROUP');  
    cols[2] = new nlobjSearchColumn('department', null, 'GROUP');
    cols[3] = new nlobjSearchColumn('postingperiod', null, 'GROUP');
    cols[4] = new nlobjSearchColumn('amount', null, 'SUM');
    
    var newSearch = nlapiCreateSearch('transaction', newFilters, cols);
    var searchResults = newSearch.runSearch();
  //  var columns = newSearch.getColumns();
    // resultIndex points to record starting current resultSet in the entire results array
    var resultIndex = 0;
    var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
    var resultSet; // temporary variable used to store the result set

    var transactionList = [];
    var allCount = 0;
    do
    {
        resultSet = searchResults.getResults(resultIndex, resultIndex + resultStep);

        for ( var i = 0; i < resultSet.length; i++ ) {
            var element = resultSet[i];
            var nsAccountId = element.getValue(cols[1]);
            var departmentId = element.getValue(cols[2]);
            var periodId = element.getValue(cols[3]);
            var amount = element.getValue(cols[4]);   

            var transactionObj = new Object;
            transactionObj.nsAccountId = nsAccountId;
            transactionObj.departmentId = departmentId;
            transactionObj.periodId = periodId;
            transactionObj.amount = amount;

            transactionList.push(transactionObj);
        }

        resultIndex = resultIndex + resultStep;

    } while (resultSet.length > 0);

    var retObj = new Object;
    retObj.glMonthList = glMonthList;
    retObj.transactionList = transactionList;

    return retObj;
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

function loadCCRange()
{
    var rangeObj = new Object;
    rangeObj['Selling'] = [3000, 3221];
    rangeObj['Marketing'] = [4351, 4464];
    rangeObj['Advertising'] = [4000, 4051];
    rangeObj['Promotion'] = [4481, 4492];
    rangeObj['Product Development'] = [7000, 7777];
    rangeObj['Store Operations'] = [3258, 3291];
    rangeObj['Royalty Expense'] = [8700];
    rangeObj['Shipping'] = [6003, 6093];
    rangeObj['General & Admin'] = [8001, 8482];

    return rangeObj;
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