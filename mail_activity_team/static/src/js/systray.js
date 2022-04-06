odoo.define("mail_activity_team.systray.ActivityMenu", function(require) {
    "use strict";

    var ActivityMenu = require("mail.systray.ActivityMenu");
    var session = require("web.session");

    ActivityMenu.include({
        events: _.extend({}, ActivityMenu.prototype.events, {
            "click .o_filter_button": "_onClickFilterButton",
        }),
        start: function() {
            this._super.apply(this, arguments);
            this.$filter_buttons = this.$(".o_filter_button");
            this.$my_activities = this.$filter_buttons.first();
            this.filter = "my";
            session.user_context = _.extend({}, session.user_context, {
                team_activities: false,
            });
        },

        _updateCounter: function(data) {
            this._super.apply(this, data);
            this.$(".o_notification_counter").text(this.activityCounter);
        },

        _onClickFilterButton: function(event) {
            var self = this;
            event.stopPropagation();
            self.$filter_buttons.removeClass("active");
            var $target = $(event.currentTarget);
            $target.addClass("active");
            self.filter = $target.data("filter");

            session.user_context = _.extend({}, session.user_context, {
                team_activities: self.filter === "team",
            });

            self._updateActivityPreview();
        },
        _onActivityFilterClick: function(event) {
            if (this.filter === "my") {
                this._super.apply(this, arguments);
            }
            if (this.filter === "team") {
                var data = _.extend(
                    {},
                    $(event.currentTarget).data(),
                    $(event.target).data()
                );
                var context = {};
                if (data.filter === "my") {
                    context.search_default_activities_overdue = 1;
                    context.search_default_activities_today = 1;
                } else {
                    context["search_default_activities_" + data.filter] = 1;
                }
                this.do_action({
                    type: "ir.actions.act_window",
                    name: data.model_name,
                    res_model: data.res_model,
                    views: [
                        [false, "kanban"],
                        [false, "form"],
                    ],
                    search_view_id: [false],
                    domain: [["activity_team_user_ids", "in", session.uid]],
                    context: context,
                });
            }
        },
        _open_boards_activities_domain: function() {
            if (this.filter === "team") {
                return {additional_context: {search_default_my_team_activities: 1}};
            }
            return this._super.apply(this, arguments);
        },
        _getActivityData: function() {
            var self = this;
            return self._super.apply(self, arguments).then(function() {
                session.user_context = _.extend({}, session.user_context, {
                    team_activities: !session.user_context.team_activities,
                });

                self._rpc({
                    model: "res.users",
                    method: "systray_get_activities",
                    args: [],
                    kwargs: {
                        context: session.user_context,
                    },
                }).then(function(data) {
                    self.activityCounter += _.reduce(
                        data,
                        function(total_count, p_data) {
                            return total_count + p_data.total_count || 0;
                        },
                        0
                    );
                    self.$(".o_notification_counter").text(self.activityCounter);
                    self.$el.toggleClass("o_no_notification", !self.activityCounter);
                    session.user_context = _.extend({}, session.user_context, {
                        team_activities: !session.user_context.team_activities,
                    });
                });
            });
        },
    });
});
