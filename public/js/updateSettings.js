//updateData
/* eslint-disable */

const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};
const showAlert = (type, msg) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  setTimeout(hideAlert, 5000);
};
//type could be either data or password
const updateSettings = async (data, type) => {
  const url =
    type === 'data'
      ? '/api/v1/users/updateMe'
      : '/api/v1/users/updateMyPassword';
  try {
    const res = await axios({
      method: 'PATCH',
      url,
      data,
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully.`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

document.querySelector('.form-user-data').addEventListener('submit', (e) => {
  e.preventDefault();
  // const name = document.getElementById('name').value;
  // const email = document.getElementById('email').value;
  // updateSettings({ name, email }, 'data');
  const form = new FormData();
  form.append('name', document.getElementById('name').value);
  form.append('email', document.getElementById('email').value);
  form.append('photo', document.getElementById('photo').files[0]);

  console.log(form);
  updateSettings(form, 'data');
});

document
  .querySelector('.form-user-settings')
  .addEventListener('submit', async (e) => {
    document.querySelector('.btn-save-password').textContent = 'Updating ....';
    e.preventDefault();
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password'
    );
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
    document.querySelector('.btn-save-password').textContent = 'SAVE PASSWORD';
  });
