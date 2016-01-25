define([
	'jquery',
	'lib/components/base/modal',
    'lib/common/fn',
    'lib/common/router',
    'lib/common/urlparams',	
	window.location.origin  + '/upl/fdtest6/widget/auth_form.js'
], function($, Modal, Fn, router, url_params, AuthForm) {
    var CustomWidget = function () {
        var self = this,
        system = self.system,
        notifiers = AMOCRM.notifications;
               
        this.actionID = [];
        this.get_ccard_info = function(callback) { //Сбор информации из карточки контакта
            if (self.system().area == 'ccard') {
                var phones = $('.card-cf-table-main-entity .phone_wrapper input[type=text]:visible'),
                emails = $('.card-cf-table-main-entity .email_wrapper input[type=text]:visible'),
                name = $('.card-top-name input').val(),
                name = self.transliterate(name.substr(0, name.indexOf(" ")));
                data = [],
                c_phones=[],c_emails=[];
                data.name = name[0].toUpperCase() + name.substr(1);
                for (var i=0;i<phones.length;i++) {
                  if($(phones[i]).val().length>0){c_phones[i]=$(phones[i]).val();}
                }
                data['phones'] = c_phones;
                for (var i=0;i<emails.length;i++)
                {
                  if($(emails[i]).val().length>0){c_emails[i]=$(emails[i]).val();}
                }
                data['emails'] = c_emails;
                console.log(data);

                if ($("#turbosms_input").val() == "" && data.phones[0].length == 12 && data.phones[0][0] == "3") {
                    $("#turbosms_input").val("+" + data.phones[0]);
                }

                return data;
            } else {
                return false;
            }
        };
        this.transliterate = function (w,v) {
            var tr='a b v g d e ["zh","j"] z i y k l m n o p r s t u f h c ch sh ["shh","shch"] ~ y ~ e yu ya ~ ["jo","e"]'.split(' ');
            var ww=''; w=w.toLowerCase().replace(/ /g,'-');
            for (i=0; i < w.length; ++i) {
                cc=w.charCodeAt(i); ch=(cc>=1072?tr[cc-1072]:w[i]);
            if (ch.length<3) ww+=ch; else ww+=eval(ch)[v];
            }
            return(ww.replace(/~/g,''));
        };
        this.get_company_info = function() {
            if ($(".company_contacts__company").find("[name=contact\\[NAME\\]]").length > 0) {
                var phones = [];
                $.each($(".company_contacts__company").find("[name*=CFV\\[" + self.params.phoneCompanyID + "\\]][type=text]"), function(ind, val) {
                    var phone = $(val).val().replace(/\D/g, "");
                    if (phone !== "") {
                        phones.push(phone);
                    }
                });
                var company = {
                    name: $(".company_contacts__company").find("[name=contact\\[NAME\\]]").val() || "",
                    address: $(".company_contacts__company").find("[name=CFV\\[" + self.params.addressCompanyID + "\\]]").val() || "",
                    budget: $(".card-budget span").text().replace(/\D/g, ""),
                    phones: phones
                };
                console.log("[name=CFV\\[" + self.params.addressCompanyID + "\\]]", company.address);
                return company;
            } else {

                var company = {
                    name: "Неизвестная компания",
                    address: "",
                    budget: $(".card-budget span").text().replace(/\D/g, ""),
                    phones: []
                };
                return company;
            }
        };
        this.get_contact_info = function() {
            if ($("#contacts_list").find("[name=contact\\[NAME\\]]").length > 0) {
                var phones = [];
                $.each($("#contacts_list").find("[name*=CFV\\[" + self.params.phoneContactID + "\\]][type=text]"), function(ind, val) {
                    var phone = $(val).val().replace(/\D/g, "");
                    if (phone !== "") {
                        phones.push(phone);
                    }
                });
                var contact = {
                    name: $("#contacts_list").find("[name=contact\\[NAME\\]]").val() || "",
                    phones: phones
                };
                return contact;
            } else {

                var contact = {
                    name: "Неизвестный контакт",
                    phones: []
                };
                return contact;
            }
        };
        this.get_lcard_info = function(callback) { //Сбор информации из карточки контакта
            console.log("[get_lcard_info] callback:", callback)
            if (self.system().area == "lcard") {
                var contact_id,
                    company_id,
                    company;
                $.get("//"+window.location.host+"/private/api/v2/json/contacts/links?deals_link="+AMOCRM.data.current_card.id, function(res){
                    console.log("links/deals_link", res.response);
                    contact_id = res.response.links[0].contact_id;
                }).done(function() {
                    $.get("//"+window.location.host+"/private/api/v2/json/contacts/list?id=" + contact_id, function(res) {
                        console.log("contacts/list", res.response);
                        company_id = res.response.contacts[0].linked_company_id;
                        $.each(res.response.contacts[0].custom_fields, function() {
                            if (this.code == "PHONE") {
                                phone = this.values[0].value;
                            }

                        });
                    }).done(function() {
                        $.get("//"+window.location.host+"/private/api/v2/json/company/list?id=" + company_id, function(res) {
                            console.log("company/list", res);
                            company = res.response.contacts[0];
                        }).done(function() {
                            if ((callback !== undefined) && (typeof callback.done == 'function')) {
                                callback.done(data);
                                return company;
                            } else {
                                return company;
                            }
                        });
                    });
                });
            } else {
                return false;
            }
        };

        this.sendRequest = function (api, data, settings, callback) { // Отправка собранной информации
		    console.log("[sendInfo]:", data, settings);
		    userID = AMOCRM.constant('user').id;
		    email = JSON.parse(self.params.user_logins)[userID];
		    key = JSON.parse(self.params.users_keys)[userID];
            self.crm_post(
                "http://script.mcdir.ru/scripts/freshdoc/" + api,
                {
                    // Передаем POST данные
                    key: key,
                    login: email,
                    hash: self.system().amohash,
                    company: data,
                    element_id: AMOCRM.data.current_card.id,
                    element_type: AMOCRM.data.current_card.element_type,
                    tempID2: data.tempID2 || ""
                },
                function(msg) {
                	console.log("[msg]", msg);
		            if ((callback !== undefined) && (typeof callback == 'function')) {
		            	console.log("running callback");
						callback(msg);
		            }
                },
                'json'
            );
        };
        this.notesSet = function (note) {
            console.log("[notesSet]: ", note);
            $.ajax({
                url: '/private/api/v2/json/notes/set',
                method: 'POST',
                data: {
                    request: {
                        notes: {
                            add: [note]
                        }
                    }
                }
            });
        };
	    this.callbacks = {
	        settings: function ($modal) {
	        	self.$modal = $modal;
	        	current_user = AMOCRM.constant('user').id;

			    $(document).one("click", ".js-getkey", function() {
			    	console.log("saser")
	                self.authForm = new AuthForm({
	                	"hash": self.system().amohash
	                });
	                self.authForm.once("iframe:close", function(e) {
	                	console.log("event:", e);
	                	if (e.status == "success") {
				            self.crm_post(
				                'http://script.mcdir.ru/scripts/freshdoc/api_keys/',
				                {
				                    hash: self.system().amohash,
				                    user_id: AMOCRM.constant('user').id
				                },
				                function(msg) {
				                	console.log("[key]", msg);
				                	$("[name=users_keys\\[" + current_user + "\\]]").val(msg.key);
				                	$modal.find('.js-widget-save').trigger('button:save:enable');
				                	$(document).find('.js-widget-save').click();
				                },
				                'json'
				            );
	                	}
	                });
			    });

				var button = self.render(
                    {
                        ref: '/tmpl/controls/button.twig'
                    },
                    {
                        text: "Получить ключ",
                        class_name: "button_key js-getkey",
                        id: self.params.widget_code +'_button_key'
                    });
				$(".widget_settings_block__fields").prepend(button);
				$(".widget_settings_block__item_field").eq(1).css("display", "none");

	        },
	        init: function() {
                console.info("test", self, self.params);
                $.ajax(
                    "/private/api/v2/json/accounts/current",
                    {
                        method: "GET",
                        fail: function(data) {
                            console.log("fail ept!")
                        },
                        success: function(data, textStatus, jqXHR) {
                            if (typeof data == "object") {
                                customVals = data.response.account.custom_fields;
                                console.info("[account data]", customVals);
                                $.each(customVals.companies, function(ind, val) {
                                    if (this.code == "PHONE") {
                                        console.info(this.name, this.id);
                                        self.params.phoneCompanyID = this.id;
                                    } else if (this.code == "ADDRESS") {
                                        console.info(this.name, this.id);
                                        self.params.addressCompanyID = this.id;
                                    }
                                });
                                $.each(customVals.contacts, function(ind, val) {
                                    if (this.code == "PHONE") {
                                        console.info(this.name, this.id);
                                        self.params.phoneContactID = this.id;
                                    }
                                });
                            } else {
                            }
                        }
                    }
                );

			    console.log("[INIT]");
			    $(document).on("page:reload", function() {
                    AMOCRM.router.navigate(url_params.setQueryParam({reload: Fn.randHex()}), {
                        trigger: true,
                        replace: true
                    });
			    });
		        return true;
	        },
	        bind_actions: function() {
			    console.log("[bind_actions]");

		   		$(document).on("click", ".kek", function(e) {
		   			var __this = this;
		   			e.preventDefault();
			   		var tempID2 = "",
				   		actionID = AMOCRM.data.current_entity + AMOCRM.data.card_page.id;
			   		//if ($.inArray(actionID, self.actionID) == -1) {
				   		console.log("create new agreement", actionID);
			   			freshdocWindow = window.open("");


				   		var dataToPost = "";
						switch (self.system().area) {
							case "lcard":
								dataToPost = self.get_company_info();
                                if (dataToPost.phones.length <= 0) {

                                    var contactInfo = self.get_contact_info();

                                    if (contactInfo.phones.length > 0) {

                                        dataToPost.phones = contactInfo.phones;
                                        console.warn("Company phones are empty; contact phones are used");
                                    } else {

                                        var phones = [];
                                        phones.push("");
                                        dataToPost.phones = phones;
                                        console.warn("Company and contact phones are empty");
                                    }
                                }
								break;
							default:
								dataToPost = "";
								console.log("wrong system area");
						}


				   		self.sendRequest("getTokens/", "test", "test2", function(response) {
			   				console.group("[getTokens]");
				   			if (response.status !== "error") {
				   				console.info("getTokens succeed");
						   		self.sendRequest("postTemp/", dataToPost, "test2", function(response) {
						   			console.group("[postTemp]");
						   			console.log("callback zadikis!!!", response);
						   			if (response.status !== "error") {
							   			var href = "https://www.freshdoc.ru/?authorize_token=" + response["authorize_token"] + "&tempID1=" + response["tempID1"] + "&tempID2=" + response["tempID2"] + "&geturl&fullscreen=1";
										var hrefResult = $(__this).attr("href", href);
										freshdocWindow.location = href;
										console.info("href =", href);
							   			// window.open("https://www.freshdoc.ru/?authorize_token=" + response["authorize_token"] + "&tempID1=" + response["tempID1"] + "&tempID2=" + response["tempID2"] + "&geturl&fullscreen=1", "_blank");

								   		self.actionID.push(actionID);
							   			var i = 0;
							   			var a = setInterval(function() {
									   		self.sendRequest("getDownloadLink/", response, "test2", function(linkResult) {
									   			console.log("linkResult", linkResult)
									   			if (linkResult.result == "file is not ready") {
									   				console.log("actionID " + actionID + " is in progress", i);

									   			} else {
								   					clearInterval(a);
								   					console.log("Clearing interval and actionID for " + actionID, linkResult);
                                                    var linkResultText = linkResult.downloadUrl.replace(":443", "");

								   					query = {};
								   					query.note_type = 4;
					                                query.element_id = AMOCRM.data.current_card.id;
													query.text = "Создан документ к сделке " + linkResultText;
					                                query.element_type = AMOCRM.data.current_card.element_type;//data.type == "company" ? 3:1
					                                self.notesSet(query);
								   					self.actionID.pop(actionID);

								   					$(document).trigger("page:reload");
									   			}
								   				i++;
									   		});
							   			}, 4000);

						   			} else {
						   				console.warn("postTemp failed!!! OSHIPKAH");
						   				freshdocWindow.close();
			                            notifiers.show_message_error({
			                                text: "Ошибка передачи данных<br> в систему FreshDoc!",
			                                without_header: true
			                            });
						   			}
						   			console.groupEnd();
						   		});
				   			} else {
				   				console.warn("getTokens failed!");
				   				freshdocWindow.close();
                                var errorText;
                                switch (response.errorDescription) {

                                    case "400":
                                        errorText = "400 Bad Request (Некорректный запрос).<br>Обратитесь в техподдержку FreshDoc";
                                        break;

                                    case "401":
                                        errorText = "401 Unauthorized (Неавторизованный доступ).<br>Обратитесь в техподдержку FreshDoc";
                                        break;

                                    case "403":
                                        //errorText = "403 Forbidden (Доступ запрещен).<br>Обратитесь в техподдержку FreshDoc";
                                        errorText = "Вы не авторизованы<br>в системе FreshDoc";

                                        break;

                                    case "404":
                                        errorText = "404 Not Found (Данные не найдены).<br>Обратитесь в техподдержку FreshDoc";
                                        break;

                                    case "500":
                                        errorText = "500 Internal server error (Внутренняя ошибка сервера).<br>Обратитесь в техподдержку FreshDoc";
                                        break;

                                    default :
                                        errorText = "400 Bad Request (Некорректный запрос).<br>Обратитесь в техподдержку FreshDoc";
                                        break;
                                }
	                            notifiers.show_message_error({
	                                text: errorText,
	                                without_header: true
	                            });
				   			}
				   			console.groupEnd();
				   		});
			   		//}
                    //else {
			   		//	console.log("Cannot create new agreement, this process is already in action", actionID);
			   		//}
			   	});

                $(document).on("click", ".registerAgreements", function(e) {
                    var __this = this;
                    e.preventDefault();
                    var tempID2 = "",
                        actionID = AMOCRM.data.current_entity + AMOCRM.data.card_page.id;

                    console.log("open register", actionID);
                    freshdocSecondWindow = window.open("");


                    self.sendRequest("getTokens/", "test", "test2", function(response) {
                        console.group("[getTokens]");
                        if (response.status !== "error") {
                            console.info("getTokens succeed");


                            var href = "https://www.freshdoc.ru/cabinet/registers/?fullscreen=1&authorize_token=" + response["authorize_token"];
                            freshdocSecondWindow.location = href;
                            console.info("href =", href);
                            //window.open("http://www.freshdoc.ru/cabinet/registers/?fullscreen=0", "_blank");
                        } else {
                            console.warn("getTokens failed!");
                            freshdocSecondWindow.close();
                            var errorText;
                            switch (response.errorDescription) {

                                case "400":
                                    errorText = "400 Bad Request (Некорректный запрос).<br>Обратитесь в техподдержку FreshDoc";
                                    break;

                                case "401":
                                    errorText = "401 Unauthorized (Неавторизованный доступ).<br>Обратитесь в техподдержку FreshDoc";
                                    break;

                                case "403":
                                    //errorText = "403 Forbidden (Доступ запрещен).<br>Обратитесь в техподдержку FreshDoc";
                                    errorText = "Вы не авторизованы<br>в системе FreshDoc";

                                    break;

                                case "404":
                                    errorText = "404 Not Found (Данные не найдены).<br>Обратитесь в техподдержку FreshDoc";
                                    break;

                                case "500":
                                    errorText = "500 Internal server error (Внутренняя ошибка сервера).<br>Обратитесь в техподдержку FreshDoc";
                                    break;

                                default :
                                    errorText = "400 Bad Request (Некорректный запрос).<br>Обратитесь в техподдержку FreshDoc";
                                    break;
                            }
                            notifiers.show_message_error({
                                text: errorText,
                                without_header: true
                            });
                        }
                        console.groupEnd();
                    });
                });

				$input = $("#turbosms_input");
				// $("body").on("focus", "#turbosms_input", function() {
					$input.focus(function() {
					if ($(this).val() == "") {
						$(this).val("+");
					}
					console.log("focus");
				});
				// $("body").on("blur", "#turbosms_input", function() {
					$input.blur(function() {
					if ($(this).val() == "+") {
						$(this).val("");
					}
					console.log("blur");
				});

				return true;
	        },
	        render: function() {

	        	console.log("[RENDER]");
                settings = self.params;
                current_user = AMOCRM.constant("user").id;
                email = JSON.parse(settings.user_logins)[current_user];
                key = JSON.parse(settings.users_keys)[current_user];
				if (self.system().area !== "comcard") {

			        var lang = self.i18n("userLang");
		            w_code = self.get_settings().widget_code;
		            if(typeof(AMOCRM.data.current_card) != "undefined") {
		                if(AMOCRM.data.current_card.id == 0) {
		                    return false;
		                } // не рендерить на contacts/add || leads/add
		            }
		            console.log("email, key", email, key);
		            if (email !== "" && key !== "") {
						$selectedStatusID = $("[name=lead\\[STATUS\\]]").val();
						if (self.system().area == "lcard") {
							// if ($("#lead_status_input").val() == "8215842" || $("#lead_status_input").val() == "8215844") {
								if ($("li[data-value=" + $selectedStatusID + "] span").text() == "Переговоры" || $("li[data-value=" + $selectedStatusID + "] span").text() == "Принимают решение") {
								console.log("need to throw notification!");
	                            notifiers.show_message_error({
	                                text: "Не забудьте создать договор для<br>клиента в системе FreshDoc!",
	                                without_header: true
	                            });
							}
						}
						self.render_template({
			                caption:{
			                    class_name:'js-ac-caption',
			                    html:''
			                },
			                body:'',
			                render :  '\
									<div class="ac-form">\
									<div class="widget-body">\
										<div class="row">\
											<div class="col-img agreement">\
											</div>\
											<div class="col-button create">\
												<a class="kek" href="#" target="_blank">Создать договор</a>\
											</div>\
										</div>\
										<div class="row">\
											<div class="col-img register">\
											</div>\
											<div class="col-button">\
												<a class="registerAgreements" href="#" target="_blank">Реестр договоров</a>\
											</div>\
										</div>\
									</div>\
									</div>\
									<div class="ac-already-subs">\
									<img class="user" src="'+settings.path+'/images/user.png"><a class="userName">'+email.split("@")[0]+'</a>\
									<img class="collapse js-widget-caption-block" src="'+settings.path+'/images/collapse.png" title="Свернуть">\
									<a href="https://www.freshdoc.ru/products/widget/" target="_blank"><img class="help" src="'+settings.path+'/images/help.png" title="Помощь"></a>\
									</div>\
									<div class="ac-already-subs ac-already-subs-long">\
									<a class="userName">'+email+'</a>\
									</div>\
									<link type="text/css" rel="stylesheet" href="'+settings.path+'/style.css" >'
			            });
		            } else {
                        notifiers.show_message_error({
                            text: "Вы не авторизованы в<br>системе FreshDoc!",
                            without_header: true
                        });
						self.render_template({
			                caption:{
			                    class_name:'js-ac-caption',
			                    html:''
			                },
			                body:'',
			                render :  '\
									<div class="ac-form">\
									<div class="widget-body">\
										<div class="row">\
											<div class="col-img agreement-inactive">\
											</div>\
											<div class="col-button-inactive">\
												Создать договор\
											</div>\
										</div>\
										<div class="row">\
											<div class="col-img register-inactive">\
											</div>\
											<div class="col-button-inactive">\
												Реестр договоров\
											</div>\
										</div>\
									</div>\
									</div>\
									<div class="ac-already-subs">\
									<img class="user" src="'+settings.path+'/images/user.png"><a class="userName">Не авторизован</a>\
									<img class="collapse js-widget-caption-block" src="'+settings.path+'/images/collapse.png" title="Свернуть">\
									<a href="https://www.freshdoc.ru/products/widget/" target="_blank"><img class="help" src="'+settings.path+'/images/help.png" title="Помощь"></a>\
									</div>\
									<link type="text/css" rel="stylesheet" href="'+settings.path+'/style.css" >'
			            });
		            }
					//<a class="logout">Выйти из сервиса</a>\

		        	var $widgetHeader = $(".widget-body").parents(".card-widgets__widget").children(".js-widget-caption-block");
					$widgetHeader.children(".card-widgets__widget__caption__arrow").remove();
					$widgetHeader.addClass("freshDoc");
				} else {
					console.log("area is comcard");
					return false;
				}

	            return true;
            },
	        contacts: {
				selected: function() {
					console.log("[contacts:selected]");
					//Здесь описано поведение при мультивыборе контактов и клике на название виджета
					var c_data = self.list_selected().selected;

					$('#js-sub-lists-container').children().remove(); //Контейнер очищается затем в контейнер собираются элементы, выделенные в списке.контейнер - div блок виджета, отображается в правой колонке.
					var names = [], // Массив имен
					length = c_data.length; // Количество выбранных id (отсчет начинается с 0)
					for (var i = 0; i < length; i++) {
						names[i]= { emails : c_data[i].emails,
						phones: c_data[i].phones};
					}
					console.log(names);
					for (var i = 0; i < length; i++) {
						$('#js-ac-sub-lists-container').append('<p>Email:'+names[i].emails+' Phone:'+names[i].phones+'</p>');
					}
					$(self.contacts).remove(); //очищаем переменную
					self.contacts = names;
				}
	        },
	        leads: {
				selected: function() {
					console.log("[leads:selected]");
				}
	        },
	        onSave: function() {
	        	console.log("[onSave]");
	        	window.location.reload();
		        return true;
		    }
        };
	    return this;
    };
    return CustomWidget;
});