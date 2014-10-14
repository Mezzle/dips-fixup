// ==UserScript==
// @name        DIPS fixup
// @namespace   http://www.sja.org.uk/wmids
// @description Fixup irritations in DIPS
// @include     https://dips.sja.org.uk/*
// @version     1
// @grant       none
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// ==/UserScript==

// We don't require a separate context for jQuery, as without the @grant none, we will be in a sandbox.
// ... exactly as we would be with the @grant none. The only difference is that with the explicit @grant none
// we don't get warnings from the user script manager about there not being a @grant.

// We still neet to tell jQuery that we want it only to play in our sandbox thus...
this.$ = jQuery.noConflict(true);

var pathArray = window.location.href.split('/');

var baseURL = window.location.origin ? window.location.origin : window.location.protocol + "//" + window.location.host;

baseURL += '/' + pathArray[3] + '/';

var navHeight = 26;

if (window.top == window) {
    $('<div style="margin-top: 50px; position: absolute; bottom: 0; left: 0; width:100%;" id="addednav">')
    .height(navHeight)
    .appendTo('body');
} else {
    
    var ournav = $('#addednav',window.top.document);
    ournav.hide();
    
    // Add Buttons here to the nav
    
    if (window.location.href.match(/MessageMembers\.asp/)) {
        $('<button id="addcontact">Add Contact Details</button>')
        .appendTo(ournav)
        .click(function() {
            $('input[name^=member]').each(function() {
                var row = $(this).closest('tr');
                getMemberContact(this.value, function(data) {
                    row.find('td:last').append($('<div>').append(data.PhoneNumber));
                    row.find('td:eq(-2)').append($('<div>').append(data.eMailAddress));
                });
            });
        });
    }
    
    ournav.not(':empty').show().closest('body').css('margin-bottom', (navHeight + 5).toString() + 'px');
    
    $(window).unload(function() {
        ournav.empty().hide().closest('body').css('margin-bottom', '5px');
    });
}

// Don't like a function starting 'get' (in lowercase) as that's conventionally reserved for (what pretend to be) property accessors in Java.
// Yes I know Java is nothing to do with Javascript but nonetheless

function getMemberContact(id, callback) {
    return $.get(baseURL + 'membermanagement-edit.asp?type=edit&number=' + id, function(page) {
        var details = {};
        $('input', page).each(function() {
            details[this.name] = this.value;
        });
        
        callback(details);
    });
}
