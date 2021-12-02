// form.js
// version 1.0.6
// jQuery library for relaxed dealing with HTML forms
// author - https://kovalchik.com.ua
// how to use -

class Form {
  constructor({
    form,
    url = '',
    ajax_data = {},
    validators = {},
    custom_ui = false,
    test_mode = false,
    loading_target = '',
  }) {
    this.form = form
    this.submit_button = form.find('[type=submit]')
    this.url = url
    this.ajax_data = ajax_data
    this.loading_target = loading_target || this.submit_button
    this.validators = {
      ...{
        email: /\S+@\S+\.\S+/,
        tel: /^.[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g,
        password: /^.{8,32}$/,
      },
      ...validators,
    }
    this.custom_ui = custom_ui
    this.test_mode = test_mode

    this.events()
  }

  events() {
    // whether to ingnore browser validation UI
    // and proceed with own .error class UI for fields, and js event 'field_status_changed'
    this.custom_ui
      ? this.submit_button.on('click', (e) => this.submitButtonProcess(e))
      : this.form.on('submit', (e) => this.submitButtonProcess(e))
  }

  // submit button process
  submitButtonProcess(e) {
    e.preventDefault()
    if (this.loading_target.hasClass('loading')) return // ajax is processing

    this.collectFormFields()
    this.checkFormFields()
      ? this.sendAjax()
      : this.form
          .find('.error')
          .eq(0)
          .focus()
  }

  // send form with ajax
  sendAjax() {
    if (this.test_mode) console.log(this.ajax_data)
    this.form.trigger('before_ajax', this.ajax_data)

    this.loading_target.addClass('loading')

    $.post(this.url, this.ajax_data, (response) => {
      if (this.test_mode) console.log(response)

      this.form.trigger('sent', response)

      let response_parsed = JSON.parse(response)
      if (response_parsed && response_parsed.success == true)
        setTimeout(() => {
          this.form.trigger('reset') // reset form after successfully sent
        }, 1000)
    })
      .fail((e) => {
        alert(`Error: ${e.status} ${e.statusText}`)
      })
      .always(() => {
        this.loading_target.removeClass('loading')
        this.form.trigger('after_ajax')
      })
  }

  // collect all form fields
  collectFormFields() {
    let self = this
    this.ajax_data['fields'] = {}
    this.form_fields = []
    this.form
      .find(
        'input:not([type=submit]):not([type=checkbox]):not([type=radio]), input:checked, select, textarea, input[required]'
      )
      .each(function() {
        self.collectField($(this))
      })
  }

  // check and validate all form fields
  checkFormFields() {
    for (let input of this.form_fields) {
      this.validateInput(input)
      this.checkInput(input) // check if input is empty or invalid
    }

    return this.form.find('.error').length ? false : true
  }

  // field validation
  validateInput(input) {
    if (
      input.value.length &&
      (this.validators[input.type] || this.validators[input.name])
    )
      if (
        this.validators[input.type] &&
        input.value.match(this.validators[input.type]) == null
      )
        input.valid = false

    if (
      this.validators[input.name] &&
      input.value.match(this.validators[input.name]) == null
    )
      input.valid = false

    if (input.type == 'checkbox' && input.required && !input.obj.is(':checked'))
      input.valid = false

    if (input.type == 'radio' && input.required && !input.obj.is(':checked'))
      input.valid = false
  }

  // collect form field data
  collectField(field) {
    let field_name = field.attr('name'),
      field_id = field.attr('id'),
      subject =
        this.form.find(`[data-subject-for=${field_name}]`).text() ||
        this.form.find(`label[for=${field_id}]`).text() ||
        field.attr('placeholder') ||
        field.attr('name')

    if (!field_name) this.onError(`Some fields don't have attribute [name]`)

    let field_data = {
      name: field_name,
      obj: field,
      value: field.val(),
      type: field.attr('type'),
      required: field.prop('required'),
      subject: subject,
      valid: true,
    }

    // collect fields data for ajax call
    if (this.ajax_data.fields[field_name]) {
      this.ajax_data.fields[field_name].value
        ? (this.ajax_data.fields[field_name].value += ', ' + field_data.value)
        : field_data.value
    } else
      this.ajax_data.fields[field_name] = {
        subject: field_data.subject,
        value: field_data.value,
      }

    // collect data for validation
    this.form_fields.push(field_data)
  }

  // check if input is empty or invalid
  checkInput(input) {
    if ((input.required && !input.value) || !input.valid) {
      input.obj.addClass('error')
      this.onInputStatusChanged(input)

      // validation on fly after input is detected as invalid
      input.obj.off('input').on('input', (e) => {
        input.value = $(e.target).val()
        input.valid = true
        this.validateInput(input)
        this.checkInput(input)
      })
      return
    }
    if (input.obj.hasClass('error')) {
      input.obj.removeClass('error')
      this.onInputStatusChanged(input)
    }
  }

  // event after input validation status changed
  onInputStatusChanged(input) {
    this.form.trigger('field_status_changed', [
      input.obj,
      input.required,
      input.valid,
    ])
  }

  // action on error
  onError(message) {
    throw new Error(message)
  }
}
