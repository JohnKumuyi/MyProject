function scheduled()
{
  //  updateSAPAcct_CCRule_point();
  // updateSAPAcct_CCRule();
  setSapAcctInNSAcct();
}

function setSapAcctInNSAcct()
{

    var results = nlapiSearchRecord( 'customrecord_sap_gl_account_map_key', 'customsearch599', null );
    if (results && results.length > 0)
    {   
        var cols = results[0].getAllColumns();
        for (var i = 0; i < results.length; i ++) 
        {
            var element = results[i];
            var ns_account = element.getValue(cols[0]);
            var ns_account_name = element.getText(cols[0]);
            var sap_account = element.getValue(cols[1]);
            var cc_rule = element.getValue(cols[2]);
            var sap_account_number = element.getValue(cols[3]);
            var sap_account_name = element.getValue(cols[4]);

            nlapiSubmitField('account', ns_account, ['custrecord_ns_acct_vs_sap_acct', 'custrecord_sap_cc_rule'], [sap_account, cc_rule]);

            if( (i % 5) == 0 ) {
               setRecoveryPoint();
            }
            checkGovernance();
        }
    }
}

function createSAPMapData()
{
    var attachment = nlapiLoadFile('145421');
    var ret = attachment.getValue();

    if (ret != 'undefined' && ret != undefined)
    { 
        sapAcctList = JSON.parse(ret);
        for ( var i = 0; i < sapAcctList.length; i++ )
        {
            var element = sapAcctList[i];
            var nsNum = element[0];
            var nsName = element[1];
            var sapNum = element[2];
            var sapName = element[3];
           
            nlapiLogExecution('Debug', i,  '' + nsNum + " : " + sapNum);
            createMapKey(nsNum, nsName, sapNum, sapName);
            
            if( (i % 5) == 0 ) {
               setRecoveryPoint();
            }
            checkGovernance();
        }     
    }
}

function createMapKey(nsNum, nsName, sapNum, sapName)
{   
    var nsAcctId = 0;
    var sapAcctId = 0;
    var filters = [];
    filters.push(new nlobjSearchFilter('number', null, 'is',  nsNum));
    var searchResult = nlapiSearchRecord('account', null, filters, null);
    if (searchResult) {
        var element = searchResult[0];
        nsAcctId = element.getId();
    }

    filters = [];
    filters.push(new nlobjSearchFilter('custrecord_account_number', null, 'equalto', sapNum));
    searchResult = nlapiSearchRecord('customrecord_sap_gl_account', null, filters, null);
    if (searchResult) {
        var element = searchResult[0];
        sapAcctId = element.getId();
    }
    
    nlapiLogExecution('Debug', 'NS', nsAcctId);
    nlapiLogExecution('Debug', 'SAP', sapAcctId);

    if (nsAcctId && sapAcctId)
    {
        filters = [];
        filters.push(new nlobjSearchFilter('custrecord_ns_gl_account', null, 'anyOf', nsAcctId));
        filters.push(new nlobjSearchFilter('custrecord_sap_gl_account', null, 'anyOf', sapAcctId));
        searchResult = nlapiSearchRecord('customrecord_sap_gl_account_map_key', null, filters, null);
        if (!searchResult) {
            try {
                var newRec = nlapiCreateRecord('customrecord_sap_gl_account_map_key');
                newRec.setFieldValue('custrecord_ns_gl_account', nsAcctId);
                newRec.setFieldValue('custrecord_sap_gl_account', sapAcctId);
                var newRecId = nlapiSubmitRecord(newRec);
                nlapiLogExecution('Debug', 'newRecId', newRecId);
            } catch ( error ) {
                if ( error.getDetails != undefined ) {
                  nlapiLogExecution( "error", "Process Error1", error.getCode() + ":" + error.getDetails() );
                } else {
                  nlapiLogExecution( "error", "Unexpected Error", error.toString() );
                }
            }
        }
    }
}

function updateSAPAcct()
{
    var filters = [];
    var searchResult = nlapiSearchRecord('customrecord_sap_gl_account', null, null, null);
    if (searchResult) {
        for (var i = 0; i < searchResult.length; i ++) {
            var element = searchResult[i];
            var recId = element.getId();
            var sapRec = nlapiLoadRecord('customrecord_sap_gl_account', recId);
            var number = sapRec.getFieldValue('custrecord_account_number');
            var name = sapRec.getFieldValue('custrecord_account_name');
            var dispName = '' + number + " : " + name;
            sapRec.setFieldValue('name', dispName);
            nlapiSubmitRecord(sapRec);

            nlapiLogExecution('Debug', i,  '' + number + " : " + name);
            if( (i % 5) == 0 ) {
               setRecoveryPoint();
            }
            checkGovernance(); 
        }
    }
}

function updateSAPAcct_CCRule()
{
    var sapAcctList = [];
    var attachment = nlapiLoadFile('145422');
    var ret = attachment.getValue();

    if (ret != 'undefined' && ret != undefined)
    { 
        sapAcctList = JSON.parse(ret);
        if (sapAcctList.length > 0) {
            var searchResult = nlapiSearchRecord('customrecord_sap_gl_account', null, null, null);
            if (searchResult) {
                for (var i = 0; i < searchResult.length; i ++) {
                    var element = searchResult[i];
                    var recId = element.getId();
                    var sapRec = nlapiLoadRecord('customrecord_sap_gl_account', recId);
                    var number = sapRec.getFieldValue('custrecord_account_number');
                    
                    var ccRule = getCCRule(number, sapAcctList);
                    nlapiLogExecution('Debug', i, ccRule);
                    ccRule = '' + ccRule;
                    sapRec.setFieldValue('custrecord_sap_cc_rule', ccRule);
                    nlapiSubmitRecord(sapRec);

                    nlapiLogExecution('Debug', i,  '' + number + " : " + ccRule);
                    if( (i % 5) == 0 ) {
                       setRecoveryPoint();
                    }
                    checkGovernance(); 
                }
            }
        }
    }
}

function updateSAPAcct_CCRule_point()
{
    var searchResult = nlapiSearchRecord('customrecord_sap_gl_account', null, null, null);
    if (searchResult)
    {
        for (var i = 0; i < searchResult.length; i ++) {
            var element = searchResult[i];
            var recId = element.getId();
            var sapRec = nlapiLoadRecord('customrecord_sap_gl_account', recId);
            var number = sapRec.getFieldValue('custrecord_account_number');
            
            var ccRule = sapRec.getFieldValue('custrecord_sap_cc_rule');
            if (ccRule) {
                ccRule = ccRule.replace(/.0/gi, "");
                sapRec.setFieldValue('custrecord_sap_cc_rule', ccRule);
                nlapiSubmitRecord(sapRec);
            }
            
            nlapiLogExecution('Debug', i,  '' + number + " : " + ccRule);
            if( (i % 5) == 0 ) {
               setRecoveryPoint();
            }
            checkGovernance(); 
        }
    }
}

function getCCRule(sapAccountNumber, sapAcctList)
{   
    var ccRule = '';
    for ( var i = 0; i < sapAcctList.length; i++ )
    {
        ccRule = '';
        var element = sapAcctList[i];
        var sapNum = element[0];
        var sapName = element[1];
        var tradingPartner = element[2];
        ccRule = element[3];

        if (sapAccountNumber == sapNum) {
            break;
        }
    }

    if (ccRule == null || ccRule == 'null' || ccRule == undefined || ccRule == 'undefined')
    {
        ccRule = '';
    }

    return ccRule;
}

function mainFromFile()
{
    var sapAcctList = getSapGlList();
      
    if (sapAcctList != 'undefined' && sapAcctList != undefined)
    { 
        sapAcctList = JSON.parse(sapAcctList);
        for ( var i = 1; i < sapAcctList.length; i++ )
        {
            var element = sapAcctList[i];
            var number = element[0];
            var name = element[1];
                
            createSAPGLAcct(number, name);
            nlapiLogExecution('Debug', i,  '' + number + " : " + name);
            if( (i % 5) == 0 ) {
               setRecoveryPoint();
            }
            checkGovernance(); 
        }     
    }  
}


function createSAPGLAcct(number, name)
{
    var newRec = nlapiCreateRecord('customrecord_sap_gl_account');
    newRec.setFieldValue('custrecord_account_number', number);
    newRec.setFieldValue('custrecord_account_name', name);
    nlapiSubmitRecord(newRec);
}

function getSapGlList()
{
   try {
      var attachment = nlapiLoadFile('145419');
      var ret = attachment.getValue();
      nlapiLogExecution("Audit", "SAP GL List", attachment.getValue());
   }
   catch(error) {
      if ( error.getDetails != undefined ) {
          nlapiLogExecution( "error", "Process Error", error.getCode() + ":" + error.getDetails() );
        }
   }
   return ret;
}

function checkGovernance()
{
 var context = nlapiGetContext();
 if( context.getRemainingUsage() < 200 )
 {
    var state = nlapiYieldScript();
    if( state.status == 'FAILURE')
    {
        nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
        throw "Failed to yield script";
    } 
    else if ( state.status == 'RESUME' )
    {
         nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason+".  Size = "+ state.size);
    }
  // state.status will never be SUCCESS because a success would imply a yield has occurred.  The equivalent response would be yield
 }
}

function setRecoveryPoint()
{
 var state = nlapiSetRecoveryPoint(); //100 point governance
 if( state.status == 'SUCCESS' ) {
    nlapiLogExecution("Audit", "Recovery Point Success");
    return;  //we successfully create a new recovery point
 }
 if( state.status == 'RESUME' ) //a recovery point was previously set, we are resuming due to some unforeseen error
 {
    nlapiLogExecution("ERROR", "Resuming script because of " + state.reason+".  Size = "+ state.size);
 //   handleScriptRecovery();
 }
 else if ( state.status == 'FAILURE' )  //we failed to create a new recovery point
 {
     nlapiLogExecution("ERROR","Failed to create recovery point. Reason = "+state.reason + " / Size = "+ state.size);
     handleRecoveryFailure(state);
 }
}

function handleRecoverFailure(failure)
{
     if( failure.reason == 'SS_MAJOR_RELEASE' ) throw "Major Update of NetSuite in progress, shutting down all processes";
     if( failure.reason == 'SS_CANCELLED' ) throw "Script Cancelled due to UI interaction";
     if( failure.reason == 'SS_EXCESSIVE_MEMORY_FOOTPRINT' ) { cleanUpMemory(); setRecoveryPoint(); }//avoid infinite loop
     if( failure.reason == 'SS_DISALLOWED_OBJECT_REFERENCE' ) throw "Could not set recovery point because of a reference to a non-recoverable object: "+ failure.information; 
}

function cleanUpMemory(){
     nlapiLogExecution("Debug", "Cleanup_Memory", "Cleanup_Memory");
}