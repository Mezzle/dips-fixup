// ==UserScript==
// @name        DIPS fixup
// @namespace   http://www.sja.org.uk/wmids
// @description Fixup irritations in DIPS
// @include     https://dips.sja.org.uk/*
// @version     1
// @grant       none
// @require     https://code.jquery.com/jquery-2.2.3.min.js
// ==/UserScript==


var $ = jQuery.noConflict(true);

var pathArray = window.location.href.split('/');

var baseURL = window.location.origin ? window.location.origin : window.location.protocol + "//" + window.location.host;

baseURL += '/' + pathArray[3] + '/';

var DIPS = {
    getMemberContact: function (id, callback) {
        return $.get(
            baseURL + 'membermanagement-edit.asp',
            {
                type: 'edit',
                number: id
            },
            function (page) {
                var details = {};
                $('input', page).each(function () {
                    details[this.name] = this.value;
                });

                callback(details);
            }
        );
    },
    getMemberDriving: function (id, callback) {
        return $.get(
            baseURL + 'MemberManagement-EditDrive.asp',
            {
                type: 'edit',
                number: id
            },
            function (page) {
                var summary = "";
                var details = {};

                $(':input', page).each(function () {
                    var name = this.name;
                    var val = $(this).val();

                    details[name] = val;
                    name = {"Car": "C", "Ambulance": "A", "Minibus": "M"}[name];
                    
                    val = {1: "F", 2: "O", 3: "R"}[val];
                    
                    if (name && val) {
                        summary = summary + ' ' + name + '=' + val;
                    }
                });
                
                callback.call(details, summary.trim());
            }
        );
    }
};

var navHeight = 26;

if (window.top == window) {
    $('<div>')
    .css({
        marginTop: '50px',
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%'
    })
    .attr('id', 'addednav')
    .height(navHeight)
    .appendTo('body');
} else {
    var ournav = $('#addednav', window.top.document);
    var parentBody = ournav.closest('body');

    ournav.hide();

    if (window.location.href.match(/MessageMembers\.asp/)) {
        $('<button id="addcontact">Add Contact Details</button>')
        .appendTo(ournav)
        .click(function () {
            $('input[name^=member]').each(function () {
                var row = $(this).closest('tr');

                row.find('.DFU-phone,.DFU-email').remove();

                DIPS.getMemberContact(this.value, function (data) {
                    row.find('td:last').append($('<div>').addClass('DFU-phone').append(data.PhoneNumber));
                    row.find('td:eq(-2)').append($('<div>').addClass('DFU-email').append(data.eMailAddress));
                });
            });
        });
    }

    if (ournav.not(':empty').length >= 1) {
        ournav.not(':empty').show();
        parentBody.css('margin-bottom', (navHeight + 5).toString() + 'px');
    }

    $(window).unload(function () {
        ournav.empty();
        ournav.hide();
        ournav.closest('body').css('margin-bottom', '5px');
    });
}
