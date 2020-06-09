$(document).ready(function() {
    window.history.forward(1);
    localStorage.removeItem('user');

    $('#login-btn').on('click', function() {
        disableButton('#login-btn');
        loading.open();

        const cred = {
            email: $('input#email').val(),
            password: $('input#password').val()
        };

        setTimeout(() => {
            $.post({ url: `/user/auth`, async: false, data: JSON.stringify(cred), contentType: 'application/json' })
                .done(result => {
                    enableButton('#login-btn');
                    loading.close();

                    localStorage.setItem('user', JSON.stringify(result));
                    document.cookie = `session=${result._id}`;

                    window.location.href = 'users';
                })
                .fail((xhr, status, error) => {
                    enableButton('#login-btn');
                    loading.close();

                    if (xhr.status == 400) {
                        errorAlert(xhr.responseText);
                        return;
                    }
                    
                    errorAlert('Something went wrong.');
                    console.log(xhr, status, error);
                });
        }, 500);
    });
});
