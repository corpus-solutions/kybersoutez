Java.perform(function () {

    var System = Java.use('java.lang.System');
    var AlertDialogBuilder = Java.use("android.app.AlertDialog$Builder");
    var DialogInterfaceOnClickListener = Java.use('android.content.DialogInterface$OnClickListener');
    var mainactivity = Java.use("cz.corpus.dva.ui.login.LoginActivity");

    mainactivity.onStart.overload().implementation = function () {
        send("MainActivity.onStart() HIT!!!");
        console.log("onStart()");
        console.log("doAlert()");
        var alert = AlertDialogBuilder.$new(this);
        alert.setMessage("What you want to do now?");

        alert.setPositiveButton("Dismiss", Java.registerClass({
            name: 'il.co.realgame.OnClickListenerPositive',
            implements: [DialogInterfaceOnClickListener],
            methods: {
                getName: function () {
                    return 'OnClickListenerPositive';
                },
                onClick: function (dialog, which) {
                    // Dismiss
                    dialog.dismiss();
                }
            }
        }).$new());

        alert.setNegativeButton("Force Close!", Java.registerClass({
            name: 'il.co.realgame.OnClickListenerNegative',
            implements: [DialogInterfaceOnClickListener],
            methods: {
                getName: function () {
                    return 'OnClickListenerNegative';
                },

                onClick: function (dialog, which) {
                    // Close Application
                    currentActivity.finish();
                    System.exit(0);
                }
            }
        }).$new());

        // Create Alert
        alert.create().show();
        
        var ret = this.onStart.overload().call(this);
    };

    mainactivity.onCreate.overload("android.os.Bundle").implementation = function (var_0) {
        
        send("MainActivity.onCreate() HIT!!!");
        console.log("onCreate()");
        
        var alert = AlertDialogBuilder.$new(this);
        alert.setMessage("What you want to do now?");

        alert.setPositiveButton("Dismiss", Java.registerClass({
            name: 'cz.corpus.dva.ui.login.OnClickListenerPositive',
            implements: [DialogInterfaceOnClickListener],
            methods: {
                getName: function () {
                    return 'OnClickListenerPositive';
                },
                onClick: function (dialog, which) {
                    // Dismiss
                    dialog.dismiss();
                }
            }
        }).$new());

        alert.setNegativeButton("Force Close!", Java.registerClass({
            name: 'cz.corpus.dva.ui.login.OnClickListenerNegative',
            implements: [DialogInterfaceOnClickListener],
            methods: {
                getName: function () {
                    return 'OnClickListenerNegative';
                },

                onClick: function (dialog, which) {
                    // Close Application
                    currentActivity.finish();
                    System.exit(0);
                }
            }
        }).$new());

        // Create Alert
        alert.create().show();

        var ret = this.onCreate.overload("android.os.Bundle").call(this, var_0);
    };

});

