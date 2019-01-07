var accountPeriodList = new Object;
var sapAcctMapObj = new Object;
var departmentListObj = new Object;

function main( request, response )
{
    var userId = nlapiGetUser();

    var fromYear = request.getParameter('from_year');
    var fromMonth = request.getParameter('from_month');
    var toYear = request.getParameter('to_year');
    var toMonth = request.getParameter('to_month');
    var subsidiary = request.getParameter('subsidiary');
    
    accountPeriodList = getAccountingPeriodIdList();    
    sapAcctMapObj = loadSAPAcctMap();
    departmentListObj = loadDepartment();

    if (fromYear && fromMonth && toYear && toMonth && subsidiary) {
        var transactionList = processTxnSap(fromYear, fromMonth, toYear, toMonth, subsidiary);
        var html = processCalcAcct(transactionList, fromYear, fromMonth, toYear, toMonth, subsidiary, userId);
        var form = makePage(html, fromYear, fromMonth, toYear, toMonth, subsidiary);
        response.writePage(form);    
    } else {
        fromYear=2018; fromMonth=1; toYear=2018; toMonth=6; subsidiary = '' + 2;
        var transactionList = processTxnSap(fromYear, fromMonth, toYear, toMonth, subsidiary);
        var html = processCalcAcct(transactionList, fromYear, fromMonth, toYear, toMonth, subsidiary, userId);
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
    var form = nlapiCreateForm('ELC P&L YTD Report');
    form.setScript('customscript140');
    
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
    var transactionList = loadTransaction(fromYear, fromMonth, toYear, toMonth, subsidiary);

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
  
    return transactionList;
}

function processCalcAcct(transactionList, fromYear, fromMonth, toYear, toMonth, subsidiary, userId)
{
    // We start to calculate GL values
    var grossSale = 0;
    var discntAndR = 0
    var netSale = 0;
    var cogs = 0;
    var invStepUp = 0;
    var grossProfit = 0;
    var selling = 0;
    var marketing = 0;
    var advertising = 0;
    var promotion = 0;
    var productDev = 0;
    var storeOperation = 0;
    var royaltyExp = 0;
    var shipping = 0;
    var generalAdmin = 0;
    var contingency = 0;
    var depAmor = 0;
    var opex = 0;
    var transitionCostInOpex = 0;
    var integration = 0;
    var controllableNop = 0;
    var royaltyAmort = 0;
    var customerListAmort = 0;
    var personaAmort = 0;
    var nop = 0;
    var transitionCostsInNonOp = 0;
    var fairValueAmort = 0;
    var realizedGainLossOnFX = 0;
    var otherNonOpExp = 0;
    var taxProvision = 0;
    var boi = 0;

    for (var i = 0; i < transactionList.length; i ++) {
        var element = transactionList[i];
        var nsAcctName = element.ns_acct_name;
        var sapAcctNum = element.sap_acct_num;
        var departmentName = element.departmentName;
        var ccRule = element.sap_cc_rule;
        var ccVal = element.ccVal;
        var amount = element.amount * 1;
        var origCCVal = ccVal;
        if (sapAcctNum != undefined && sapAcctNum != 'undefined') {
            sapAcctNum *= 1;
            if (sapAcctNum == 4000110) {
                grossSale += amount;    
            }

            if (sapAcctNum > 4000000 && sapAcctNum < 5000000) {
                netSale += amount;
            }

            if (sapAcctNum > 5000000 && sapAcctNum < 6000000) {
                cogs += amount;
            }

            if (sapAcctNum == 5055005) {
                invStepUp += amount;
            }

            if (sapAcctNum == 6171405) {
                customerListAmort += amount;
            }

            if (sapAcctNum == 6170200 || sapAcctNum == 6170850 || sapAcctNum == 6170900 || sapAcctNum == 6171100/* || sapAcctNum == 6171405*/) {
                depAmor += amount;
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
                    selling += amount;
                } 
                if (ccVal >= 4351 && ccVal <= 4464) {
                    marketing += amount;
                }
                if (ccVal >= 4000 && ccVal <= 4051) {
                    advertising += amount;
                }
                if (ccVal >= 4481 && ccVal <= 4492) {
                    promotion += amount;
                }
                if (ccVal >= 7000 && ccVal <= 7777) {
                    productDev += amount;
                }
                if (ccVal >= 3258 && ccVal <= 3291) {
                    storeOperation += amount;    
                }
                if (ccVal == 8700) {
                    royaltyExp += amount;
                }
                if (ccVal >= 6003 && ccVal <= 6093) {
                    shipping += amount;
                }
                if (ccVal >= 8001 && ccVal <= 8482 && ccVal != 8066) {
                //    if (origCCVal && origCCVal != undefined && origCCVal != 'undefined' && origCCVal != '') {
                        generalAdmin += amount;
                //    }
                }
                if (ccVal == 8066) {
                    transitionCostInOpex += amount;
                }
                if (ccVal == 'TC_NONOP') {
                    transitionCostsInNonOp += amount;
                }
                if (ccVal == 'FV_AMORT') {
                    fairValueAmort += amount;
                }
                if (ccVal == 'FX') {
                    realizedGainLossOnFX += amount;
                }
                if (ccVal == 'NON_OP') {
                    otherNonOpExp += amount;
                }
                if (ccVal == 'TAX') {
                    taxProvision += amount;
                }
            }
        }
    }

    generalAdmin = generalAdmin - customerListAmort - depAmor;
    discntAndR = netSale - grossSale;
    grossProfit = netSale - cogs - invStepUp;
    opex = selling + marketing + advertising + promotion + productDev + storeOperation + royaltyExp + shipping + generalAdmin + contingency + depAmor;
    controllableNop = grossProfit - opex - transitionCostInOpex - integration;
    nop = controllableNop - (royaltyAmort + customerListAmort + personaAmort);
    boi = nop - (transitionCostsInNonOp + fairValueAmort + realizedGainLossOnFX + otherNonOpExp + taxProvision);

    var grossSale_link = createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Gross Sales');
    var netSale_link = createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Net Sales');
    var cogs_link = createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'COGS');
    var invStepUp_link = createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Inv. Step Up');
    var customerListAmort_link = createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Customer List Amort');
    var depAmor_link = createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Dep & Amor');
    var selling_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Selling');
    var marketing_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Marketing');
    var advertising_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Advertising');
    var promotion_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Promotion');
    var productDev_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Prodcut Development');
    var storeOperation_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Store Operations');
    var royaltyExp_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Royalty Expense');
    var shipping_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Shipping');
    var generalAdmin_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'General & Admin');
    var costsInOpex_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Trasition Costs in Opex');
    var costsInNonOp_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Transition Costs in NonOp');
    var fairValueAmort_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Fair Value Amort');
    var gainLoss_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Realized (Gain)/Loss on FX');
    var otherNonOp_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Other Non Op - Expenses');
    var taxProvision_link = createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, 'Tax Provision');

    var html = "";
        html += "<style>";
        html += ".report_bold_cell{font-weight: bold}";
        html += ".report_head_cell{font-weight: normal; background-color: #e0e6ef; min-width:70px}";
        html += ".title_row{display:none}";
        html += "</style>";
        html += "<table id='tbl_obj' style='border-collapse: collapse;'>";
        html += "<tr class='title_row' style='font-weight:bold; font-size: 14pt;'><td style='text-align:center;' colspan=3>ELC P&L YTD Report</td></tr>";
        html += "<tr><td class='report_head_cell' style='border-top: solid 3px white; border-right: solid 1px rgb(199, 199, 199); border-top: solid 1px rgb(199, 199, 199); padding-left: 3px'>FINANCIAL ROW</td><td  class='report_head_cell' colspan=2 style='text-align:center; border-top: solid 1px rgb(199, 199, 199);'>YTD P&L</td></tr>";
        html += "<tr><td class='report_head_cell' style='border-right: solid 1px rgb(199, 199, 199);'></td><td class='report_head_cell' style='padding-left: 30px'>$ ['000]</td><td class='report_head_cell' style='padding-left: 80px;'>%</td></tr>";
        html += "<tr><td>Gross Sales</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='"+ grossSale_link +"'>$" + addCommas(parseFloat(Math.round(grossSale))) + "</a></td><td><a style='text-decoration:none' title='Testkamerkgmkermhbkermjhkmerkhaerherhejrhemh'></a></td></tr>";
        html += "<tr><td>Discount & Returns</td><td style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(discntAndR))) + "</td></tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell'>Net Sales</td><td class='report_bold_cell' style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='"+ netSale_link +"'>$" + addCommas(parseFloat(Math.round(netSale))) +"</a></td><td class='report_bold_cell' style='padding-left: 80px'>" + addCommas(parseFloat(netSale*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";
        html += "<tr><td>COGS</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='"+ cogs_link +"'>$" + addCommas(parseFloat(Math.round(cogs))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(cogs*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Inv. Step Up</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='"+ invStepUp_link +"'>$" + addCommas(parseFloat(Math.round(invStepUp)))  +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(invStepUp*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell'>Gross Profit</td><td class='report_bold_cell' style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(grossProfit))) +"</td><td class='report_bold_cell' style='padding-left: 80px'>" + addCommas(parseFloat(grossProfit*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";
        html += "<tr><td>Selling</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + selling_link +"'>$" + addCommas(parseFloat(Math.round(selling))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(selling*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Marketing</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + marketing_link +"'>$" + addCommas(parseFloat(Math.round(marketing))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(marketing*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Advertising</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + advertising_link +"'>$" + addCommas(parseFloat(Math.round(advertising))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(advertising*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Promotion</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + promotion_link +"'>$" + addCommas(parseFloat(Math.round(promotion))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(promotion*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Prodcut Development</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + productDev_link +"'>$" + addCommas(parseFloat(Math.round(productDev))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(productDev*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Store Operations</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + storeOperation_link +"'>$" + addCommas(parseFloat(Math.round(storeOperation))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(storeOperation*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Royalty Expense</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + royaltyExp_link +"'>$" + addCommas(parseFloat(Math.round(royaltyExp))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(royaltyExp*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Shipping</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + shipping_link +"'>$" + addCommas(parseFloat(Math.round(shipping))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(shipping*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>General & Admin</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + generalAdmin_link +"'>$" + addCommas(parseFloat(Math.round(generalAdmin))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(generalAdmin*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Contigency</td><td style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(contingency))) +"</td><td style='padding-left: 80px'>" + addCommas(parseFloat(contingency*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Dep & Amor</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='"+ depAmor_link +"'>$" + addCommas(parseFloat(Math.round(depAmor))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(depAmor*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Opex</td><td style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(opex))) +"</td><td style='padding-left: 80px'>" + addCommas(parseFloat(opex*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Trasition Costs in Opex</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + costsInOpex_link +"'>$" + addCommas(parseFloat(Math.round(transitionCostInOpex))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(transitionCostInOpex*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Integration</td><td style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(integration))) +"</td><td style='padding-left: 80px'>" + addCommas(parseFloat(integration*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell'>Controllable NOP</td><td class='report_bold_cell' style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(controllableNop))) +"</td><td class='report_bold_cell' style='padding-left: 80px'>" + addCommas(parseFloat(controllableNop*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>&nbsp;</td><td style='padding-left: 30px'>&nbsp;</td></tr>";
        html += "<tr><td>Royalty Amort</td><td style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(royaltyAmort))) +"</td><td style='padding-left: 80px'>" + addCommas(parseFloat(royaltyAmort*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Customer List Amort</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='"+ customerListAmort_link +"'>$" + addCommas(parseFloat(Math.round(customerListAmort)))  +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(customerListAmort*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Persona Amort</td><td style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(personaAmort)))  +"</td><td style='padding-left: 80px'>" + addCommas(parseFloat(personaAmort*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell'>NOP</td><td class='report_bold_cell' style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(nop))) +"</td><td class='report_bold_cell' style='padding-left: 80px'>" + addCommas(parseFloat(nop*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>&nbsp;</td><td>&nbsp;</td></tr>";
        html += "<tr><td>Transition Costs in NonOp</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + costsInNonOp_link +"'>$" + addCommas(parseFloat(Math.round(transitionCostsInNonOp))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(transitionCostsInNonOp*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Fair Value Amort</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + fairValueAmort_link +"'>$" + addCommas(parseFloat(Math.round(fairValueAmort)))  +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(fairValueAmort*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Realized (Gain)/Loss on FX</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + gainLoss_link +"'>$" + addCommas(parseFloat(Math.round(realizedGainLossOnFX)))  +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(realizedGainLossOnFX * 1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Other Non Op - Expenses</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + otherNonOp_link +"'>$" + addCommas(parseFloat(Math.round(otherNonOpExp))) +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(otherNonOpExp*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr><td>Tax Provision</td><td style='padding-left: 30px'><a style='text-decoration:none' target='_blank' href='" + taxProvision_link +"'>$" + addCommas(parseFloat(Math.round(taxProvision)))  +"</a></td><td style='padding-left: 80px'>" + addCommas(parseFloat(taxProvision*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
        html += "<tr style='font-weight:bold'><td class='report_bold_cell'>BOI</td><td class='report_bold_cell' style='padding-left: 30px'>$" + addCommas(parseFloat(Math.round(boi)))  +"</td><td class='report_bold_cell' style='padding-left: 80px'>" + addCommas(parseFloat(boi*1 / netSale * 100).toFixed(1)) + " %</td></tr>";
    html += "</table>";
    html += "</html>";
    
    return html;
}

function createPLNumberLink(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, plNumberType)
{
    var subFilters = [];
    var year = fromYear;
    var month = fromMonth;
    do{
        var strPeriod = monthArr[month - 1] + ' ' + year;
        var periodId = accountPeriodList[strPeriod];
        if (periodId != undefined && periodId != 'undefined') {
            subFilters.push(new Array('postingperiod', 'is', periodId));    
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
    newFilters.push(subFilters);
    
    var cols = [];
    cols.push( new nlobjSearchColumn('accounttype', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('account', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_ns_acct_vs_sap_acct', 'account', 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_cc_rule', 'account', 'GROUP') );
    cols.push( new nlobjSearchColumn('department', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_ccm', 'department', 'GROUP') );
    cols.push( new nlobjSearchColumn('amount', null, 'SUM') );
    
    var searchTitle = 'P&L SAP Report - ' + plNumberType;
    var searchScriptId = 'customsearch_' + getSearchId(plNumberType) + '_' + userId;

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

function createPLNumberLink_CCRule(fromYear, fromMonth, toYear, toMonth, subsidiary, userId, plNumberType)
{
    var subFilters = [];
    var year = fromYear;
    var month = fromMonth;
    do{
        var strPeriod = monthArr[month - 1] + ' ' + year;
        var periodId = accountPeriodList[strPeriod];
        if (periodId != undefined && periodId != 'undefined') {
            subFilters.push(new Array('postingperiod', 'is', periodId));    
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
    newFilters.push(subFilters);

    
    
    var cols = [];
    cols.push( new nlobjSearchColumn('accounttype', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('account', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_ns_acct_vs_sap_acct', 'account', 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_cc_rule', 'account', 'GROUP') );
    cols.push( new nlobjSearchColumn('department', null, 'GROUP') );
    cols.push( new nlobjSearchColumn('custrecord_sap_ccm', 'department', 'GROUP') );
    cols.push( new nlobjSearchColumn('amount', null, 'SUM') );
    
    var searchTitle = 'P&L SAP Report - ' + plNumberType;
    var searchScriptId = 'customsearch_' + getSearchId(plNumberType) + '_' + userId;

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
 //   var results = nlapiSearchRecord( 'account', 'customsearch1477', null );

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
    //    var cols = results[0].getAllColumns();
        for (var i = 0; i < results.length; i ++) 
        {
            var element = results[i];
            var ns_account = element.getId();
            var ns_account_name = element.getValue(cols[0]);
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

function loadTransaction(fromYear, fromMonth, toYear, toMonth, subsidiary)
{
    var subFilters = [];
    var year = fromYear;
    var month = fromMonth;
    do{
        var strPeriod = monthArr[month - 1] + ' ' + year;
        var periodId = accountPeriodList[strPeriod];
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
    if (subsidiary != -10) {
        newFilters.push(new Array('subsidiary', 'anyof', [subsidiary]));
        newFilters.push('AND');        
    }
    newFilters.push(subFilters);
    
    var cols = [];
    cols[0] = new nlobjSearchColumn('accounttype', null, 'GROUP');
    cols[1] = new nlobjSearchColumn('account', null, 'GROUP');  
    cols[2] = new nlobjSearchColumn('department', null, 'GROUP');
    cols[3] = new nlobjSearchColumn('amount', null, 'SUM');
    
    var newSearch = nlapiCreateSearch('transaction', newFilters, cols);
    var searchResults = newSearch.runSearch();
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
            var nsAccountName = element.getText(cols[1]);
            var departmentId = element.getValue(cols[2]);
            var departmentName = element.getText(cols[2]);
            var amount = element.getValue(cols[3]);
 //             var amount = element.getValue(cols[2])*1;   

            var transactionObj = new Object;
            transactionObj.nsAccountId = nsAccountId;
            transactionObj.nsAccountName = nsAccountName;
            transactionObj.departmentId = departmentId;
            transactionObj.departmentName = departmentName;
            transactionObj.amount = amount;

            transactionList.push(transactionObj);
        }

        resultIndex = resultIndex + resultStep;

    } while (resultSet.length > 0);
    
    return transactionList;
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