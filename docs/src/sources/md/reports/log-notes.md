* Earliest first.
* A number of these logs are only written when running with the environment
  variable `DEBUG` set. 
* Many of the logged actions have been run asychronously, so may not represent
  an accurate timeline of events.
* The header of each notes the UTC time that the log was recorded and a brief
  message about the data being logged. To the right is an indication of the
service which the data is intended for, related to, or received from.
* The field `rc_subscription_ids` is something of a misnomer that I borrowed
  from Recharge to represent a concise summary of the items, it does not relate
directly to the Recharge field of the same name (though it does somewhat).
* The `properties` field are the properties of subscription objects saved in
  Recharge. 
* The `messages` field always includes messages intended for the customer when
  updates or changes have been made, either to be presented in the web
interface or included in confirmation emails.
* Some fields are hidden for brevity, check the boxes above to include the
  additional fields:
