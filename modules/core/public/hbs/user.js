{"user":{"p":"user","tf":"function (Handlebars,depth0,helpers,partials,data) {\n  this.compilerInfo = [2,'>= 1.0.0-rc.3'];\nhelpers = helpers || Handlebars.helpers; data = data || {};\n  var buffer = \"\", stack1, stack2, options, functionType=\"function\", escapeExpression=this.escapeExpression, self=this, blockHelperMissing=helpers.blockHelperMissing;\n\nfunction program1(depth0,data) {\n  \n  var buffer = \"\", stack1;\n  buffer += \"\\n\t\t$(\\\"#ski_editUser\\\").iframeContainer(\\\"triggerEvent\\\",{name:'setEditUserDialogData',data:{id:\\\"\";\n  if (stack1 = helpers._id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0._id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"\\\", firstName:\\\"\";\n  if (stack1 = helpers.firstName) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.firstName; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"\\\", lastName:\\\"\";\n  if (stack1 = helpers.lastName) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.lastName; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"\\\", login:\\\"\";\n  if (stack1 = helpers.login) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.login; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"\\\"}});\\n\t\t\";\n  return buffer;\n  }\n\nfunction program3(depth0,data) {\n  \n  \n  return \"Your prefferences\";\n  }\n\nfunction program5(depth0,data) {\n  \n  var buffer = \"\", stack1, options;\n  buffer += \"<a href=\\\"javascript:void(0):\\\" name=\\\"openEditPref\\\">\";\n  options = {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data};\n  if (stack1 = helpers.i18n) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.i18n; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.i18n) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"</a>\";\n  return buffer;\n  }\nfunction program6(depth0,data) {\n  \n  \n  return \"edit\";\n  }\n\nfunction program8(depth0,data) {\n  \n  var buffer = \"\", stack1, stack2, options;\n  buffer += \"\\n\t\t<table class=\\\"table\\\">\\n\t\t\t<tbody>\\n\t\t\t\t\";\n  stack2 = ((stack1 = ((stack1 = ((stack1 = depth0.user),stack1 == null || stack1 === false ? stack1 : stack1.loggedin)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data}));\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"\\n\t\t\t\t<tr>\\n\t\t\t\t\t<td>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data};\n  if (stack2 = helpers.i18n) { stack2 = stack2.call(depth0, options); }\n  else { stack2 = depth0.i18n; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if (!helpers.i18n) { stack2 = blockHelperMissing.call(depth0, stack2, options); }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"</td><td>\";\n  if (stack2 = helpers.language) { stack2 = stack2.call(depth0, {hash:{},data:data}); }\n  else { stack2 = depth0.language; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  buffer += escapeExpression(stack2)\n    + \"</td>\\n\t\t\t\t</tr>\\n\t\t\t\t<tr>\\n\t\t\t\t\t<td>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(18, program18, data),data:data};\n  if (stack2 = helpers.i18n) { stack2 = stack2.call(depth0, options); }\n  else { stack2 = depth0.i18n; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if (!helpers.i18n) { stack2 = blockHelperMissing.call(depth0, stack2, options); }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"</td><td>\";\n  if (stack2 = helpers.timeZone) { stack2 = stack2.call(depth0, {hash:{},data:data}); }\n  else { stack2 = depth0.timeZone; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  buffer += escapeExpression(stack2)\n    + \"</td>\\n\t\t\t\t</tr>\\n\t\t\t</tbody>\\n\t\t</table>\\n\t\t\";\n  return buffer;\n  }\nfunction program9(depth0,data) {\n  \n  var buffer = \"\", stack1, options;\n  buffer += \"\t\t\\n\t\t\t\t<tr>\\n\t\t\t\t\t<td>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data};\n  if (stack1 = helpers.i18n) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.i18n; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.i18n) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"</td><td>\";\n  if (stack1 = helpers.firstName) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.firstName; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"</td>\\n\t\t\t\t</tr>\\n\t\t\t\t<tr>\\n\t\t\t\t\t<td>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data};\n  if (stack1 = helpers.i18n) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.i18n; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.i18n) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"</td><td>\";\n  if (stack1 = helpers.lastName) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.lastName; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"</td>\\n\t\t\t\t</tr>\\n\t\t\t\t<tr>\\n\t\t\t\t\t<td>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data};\n  if (stack1 = helpers.i18n) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.i18n; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.i18n) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"</td><td>\";\n  if (stack1 = helpers.login) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.login; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"</td>\\n\t\t\t\t</tr>\\n\t\t\t\t\";\n  return buffer;\n  }\nfunction program10(depth0,data) {\n  \n  \n  return \"First name\";\n  }\n\nfunction program12(depth0,data) {\n  \n  \n  return \"Last name\";\n  }\n\nfunction program14(depth0,data) {\n  \n  \n  return \"Login\";\n  }\n\nfunction program16(depth0,data) {\n  \n  \n  return \"Gui language\";\n  }\n\nfunction program18(depth0,data) {\n  \n  \n  return \"Timezone\";\n  }\n\nfunction program20(depth0,data) {\n  \n  \n  return \"Your permissions\";\n  }\n\nfunction program22(depth0,data) {\n  \n  var buffer = \"\", stack1, options;\n  buffer += \"<a href=\\\"javascript:void(0);\\\" name=\\\"editPerm\\\">\";\n  options = {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data};\n  if (stack1 = helpers.i18n) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.i18n; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.i18n) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"</a>\";\n  return buffer;\n  }\n\nfunction program24(depth0,data) {\n  \n  var buffer = \"\", stack1, options;\n  buffer += \"\\n\t\t\t<h4>\";\n  if (stack1 = helpers.module) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.module; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \":</h4>\\n\t\t\t\";\n  options = {hash:{},inverse:self.noop,fn:self.program(25, program25, data),data:data};\n  if (stack1 = helpers.perm) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.perm; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.perm) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"\\n\t\t\";\n  return buffer;\n  }\nfunction program25(depth0,data) {\n  \n  var buffer = \"\";\n  buffer += \"\\n\t\t\t\t&nbsp;&nbsp;&nbsp;\"\n    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))\n    + \"<br />\\n\t\t\t\";\n  return buffer;\n  }\n\n  buffer += \"<script type=\\\"text/javascript\\\">\\n$(document).ready(function() {\\n\t$(\\\"a[name=\\\\\\\"openEditPref\\\\\\\"]\\\").click(function(){\\n\t\tif ($(\\\"#changePass\\\").is(\\\":checked\\\"))\\n\t\t\t$(\\\".pass\\\").show();\\n\t\telse\\n\t\t\t$(\\\".pass\\\").hide();\\n\t\t$(\\\"#ski_editUser\\\").iframeContainer({src:\\\"\";\n  if (stack1 = helpers.prefix) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.prefix; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"/userprefferences\\\", host:\\\"\";\n  if (stack1 = helpers.host) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.host; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"\\\"});\\n\t\t\";\n  options = {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data};\n  if (stack1 = helpers.user) { stack1 = stack1.call(depth0, options); }\n  else { stack1 = depth0.user; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  if (!helpers.user) { stack1 = blockHelperMissing.call(depth0, stack1, options); }\n  if(stack1 || stack1 === 0) { buffer += stack1; }\n  buffer += \"\\n\t\t$(\\\"#ski_editUser\\\").iframeContainer(\\\"open\\\");\\n\t});\\n\t$(\\\"body\\\").on('accountEditSuccess',function(e,id){\\n\t\tlocation.reload(true);\\n\t});\\n\\n\t$(\\\"#ski_editPermissions\\\").iframeContainer({src:\\\"\";\n  if (stack1 = helpers.prefix) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.prefix; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"/userpermisions\\\", host:\\\"\";\n  if (stack1 = helpers.host) { stack1 = stack1.call(depth0, {hash:{},data:data}); }\n  else { stack1 = depth0.host; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }\n  buffer += escapeExpression(stack1)\n    + \"\\\"});\\n\t$(\\\"a[name=\\\\\\\"editPerm\\\\\\\"]\\\").click(function(){\\n\t\t$(\\\"#ski_editPermissions\\\").iframeContainer(\\\"triggerEvent\\\",{name:'setEditPermDialogData',data:{uid:\\\"\"\n    + escapeExpression(((stack1 = ((stack1 = depth0.user),stack1 == null || stack1 === false ? stack1 : stack1._id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))\n    + \"\\\", permissions:\";\n  if (stack2 = helpers.userPermissions) { stack2 = stack2.call(depth0, {hash:{},data:data}); }\n  else { stack2 = depth0.userPermissions; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \" } });\\n\t\t$(\\\"#ski_editPermissions\\\").iframeContainer(\\\"open\\\");\\n\t})\\n\\n\t$(\\\"body\\\").on('permisionsEditSuccess',function(e,id){\\n\t\tlocation.reload(true);\\n\t});\\n});\\n</script>\\n\\n<div class=\\\"row\\\">\\n\t<div class=\\\"span6\\\">\\n\t\t<h2>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data};\n  if (stack2 = helpers.i18n) { stack2 = stack2.call(depth0, options); }\n  else { stack2 = depth0.i18n; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if (!helpers.i18n) { stack2 = blockHelperMissing.call(depth0, stack2, options); }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"</h2>\\n\t\t\";\n  stack2 = ((stack1 = ((stack1 = ((stack1 = ((stack1 = depth0.user),stack1 == null || stack1 === false ? stack1 : stack1.perm)),stack1 == null || stack1 === false ? stack1 : stack1.core_me_edit)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data}));\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"\\n\t\t\";\n  options = {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data};\n  if (stack2 = helpers.user) { stack2 = stack2.call(depth0, options); }\n  else { stack2 = depth0.user; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if (!helpers.user) { stack2 = blockHelperMissing.call(depth0, stack2, options); }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"\\n\t</div>\\n\t<div class=\\\"span6\\\">\\n\t\t<h2>\";\n  options = {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data};\n  if (stack2 = helpers.i18n) { stack2 = stack2.call(depth0, options); }\n  else { stack2 = depth0.i18n; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if (!helpers.i18n) { stack2 = blockHelperMissing.call(depth0, stack2, options); }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"</h2>\\n\t\t\";\n  stack2 = ((stack1 = ((stack1 = ((stack1 = ((stack1 = depth0.user),stack1 == null || stack1 === false ? stack1 : stack1.perm)),stack1 == null || stack1 === false ? stack1 : stack1.core_user_edit)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1)),blockHelperMissing.call(depth0, stack1, {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data}));\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"\\n\t\t<hr class=\\\"no-margin-top\\\">\\n\t\t\";\n  options = {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data};\n  if (stack2 = helpers.permissions) { stack2 = stack2.call(depth0, options); }\n  else { stack2 = depth0.permissions; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }\n  if (!helpers.permissions) { stack2 = blockHelperMissing.call(depth0, stack2, options); }\n  if(stack2 || stack2 === 0) { buffer += stack2; }\n  buffer += \"\\n\t</div>\\n</div>\\n<div id=\\\"ski_editUser\\\"></div>\\n<div id=\\\"ski_editPermissions\\\"></div>\\n\";\n  return buffer;\n  }","mt":1365455261000,"pt":[]},"hogan":{"v":4,"st":"user"}}