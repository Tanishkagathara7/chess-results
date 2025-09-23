
//____________________________________________________________________________________________
// 12-Nov-2018: Stacked Modal
//____________________________________________________________________________________________

// FUN: Generate HTML Modal
function funCreateBlankModal(modalId, modalSize, modalContent) {

    if (modalSize.includes("viewiFrameLG"))
        modalSize = "lg";
    if (modalSize.includes("viewiFrameReg"))
        modalSize = "md";
    if (modalSize.includes("viewiFrameFull"))
        modalSize = "full";


    if (modalSize.includes("viewExtraSmall"))
        modalSize = "xs";
    else if (modalSize.includes("viewSmall"))
        modalSize = "sm";
    else if (modalSize.includes("viewMedium"))
        modalSize = "md";
    else if (modalSize.includes("viewLarge"))
        modalSize = "lg";
    else if (modalSize.includes("viewFull"))
        modalSize = "full";
    

    var $modalHtml = "" +
        "<div class='modal fade' id='" + modalId + "' role='dialog' aria-labelledby='myModalLabel' aria-hidden='true'>" +
        "<div class='modal-dialog modal-" + modalSize + "'>" +
        "<div class='modal-content'>" +
        modalContent +
        "<span id='hd-modal-id' style='display: none;'>#" + modalId + "</span>" +
        //"<div id='" + modalContentDivId + "'>Jay</div>" +
        "</div>" +
        "</div>" +
        "</div>";
    $('body').append($modalHtml);
    //$("#" + modalId).modal({
    //    backdrop: 'static',
    //    keyboard: false
    //});
    $("#" + modalId).modal('show');

    $("#" + modalId).on('hidden.bs.modal',
        function (e) {
            $(this).remove();
        });
}

// FUN: Modal Button Click Event

$(document).on("click", ".modalButton", function () {
    var btn = this;
    var formId = $(btn).attr("id");
    var url = $(btn).attr("href");
    var modalSize = $(btn).attr("data-target");

  //  var modalId = "myModal" + ((url.split('?')[0]).split("/").join("-"));

    var modalId = "myModal" + formId;

    $.ajax({
        url: url,
        method: "GET",
        dataType: "html"
    }).success(function (result, status, xhr) {
        funCreateBlankModal(modalId, modalSize, xhr.responseText);
        //OnSuccess(formId, xhr.responseText);
    }).error(function (xhr, status, error) {
        //OnFailure(xhr, status, error);
        console.log(error + " | " + status);
    });
});

