  /*
   * @function getCancelledSubscription
   * Retreive a cancelled subscription after cancelling
   */
  const getCancelledSubscription = async () => {
    let uri = `/api/recharge-cancelled-subscription`;
    uri = `${uri}/${subscription.attributes.customer.id}/${subscription.attributes.address_id}`;
    uri = `${uri}?ids=${ subscription.includes.map(el => el.subscription_id).join(",") }`;
    uri = `${uri}&subscription_id=${subscription.attributes.subscription_id}`;
    return Fetch(encodeURI(uri))
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          loading = false;
          this.refresh();
          return null;
        };
        return json;
      })
      .catch((err) => {
        fetchError = err;
        loading = false;
        this.refresh();
        return null;
      });
  };

  /**
   * @function getActivatedSubscription
   * Reload this particular charge from the server as a 'subsciption' object
   */
  const getActivatedSubscription = async (data) => {
    // this call needs to check updates_pending and return message, otherwise we get the subscription
  
    let src = `/api/recharge-customer-charge`;
    const headers = { "Content-Type": "application/json" };
    const body = {
      customer_id: data.customer__id,
      address_id: data.address_id,
      subscription_id: data.subscription_id,
      scheduled_at: data.scheduled_at,
      charge_id: data.charge_id,
    };
    return await PostFetch({ src, data: body, headers })
      .then((result) => {
        const { error, json } = result;
        if (error !== null) {
          fetchError = error;
          return null;
        } else {
          return json.subscription;
        };
      })
      .catch((err) => {
        fetchError = err;
      });
  };

  /**
   * @function reloadCharge
   * Reload this particular charge from the server as a 'subsciption' object
   * @listens socket.closed
   */
  const reloadCharge = async (ev) => {

    ev.stopPropagation();

    const { detail } = ev;

    if (!["cancelled", "deleted", "reactivated"].includes(detail.action)) return;

    const { charge_id, session_id, subscription_id, action } = detail;

    // get the message blocks to remove them
    const socketMessages = document.getElementById(messageDivId);

    if (socketMessages) {
      socketMessages.classList.add("closed"); // uses css transitions
    };

    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;

      this.dispatchEvent(toastEvent({
        notice: `Updates completed after ${timeTaken} minutes` ,
        bgColour: "black",
        borderColour: "black"
      }));
    } else {
      console.warn("No timer object");
    };

    // use timeoout to wait for the collapse to complete
    setTimeout(async () => {
      if (socketMessages) {
        // clear the socket messaages
        socketMessages.innerHTML = "";
      } else {
        console.warn("No socketMessages object");
      };

      if (action === "reactivated") {
        // in this case we must reload as the new subscription from charge_id and subscriptionid from ev.detai??

        const reactivated = await getActivatedSubscription(detail);
        // then dispatch event to Customer which will shuffle the grouped subscriptions
        const subdiv = document.querySelector(`#subscription-${detail.subscription_id}`);
        if (subdiv) {
          setTimeout(() => {
            animateFadeForAction(subdiv, () => {
              this.dispatchEvent(
                new CustomEvent("subscription.reactivated", {
                  bubbles: true,
                  detail: {
                    subscription: reactivated,
                    //list: "chargeGroups",
                    subscription_id: detail.subscription_id,
                  },
                })
              );
            });
          }, 100);
          /*
        } else {
          console.log("darn no subdiv", `#subscription-${detail.subscription_id}`);
          setTimeout(() => {
              this.dispatchEvent(
                new CustomEvent("subscription.reactivated", {
                  bubbles: true,
                  detail: {
                    subscription: reactivated,
                    //list: "chargeGroups",
                    subscription_id: reactivated.id,
                  },
                })
              );
          }, 100);
          */
        };

      } else if (action === "deleted") {
        const subdiv = document.querySelector(`#subscription-${detail.subscription_id}`);
        setTimeout(() => {
          animateFadeForAction(subdiv, () => {
            this.dispatchEvent(
              new CustomEvent("subscription.deleted", {
                bubbles: true,
                detail: {
                  subscription,
                  subscription_id: detail.subscription_id
                },
              })
            );
          });
        }, 100);
      };

    });
    return;
  };

  /**
   * @function reloadChargeOld
   * Reload this particular charge from the server as a 'subsciption' object
   * @listens socket.closed
   */
  const reloadChargeOld = async (ev) => {

    const { detail } = ev;
    //console.log(detail);

    const { charge_id, session_id, subscription_id, action } = detail;

    ev.stopPropagation(); // otherwise other listening components catch this on the window

    if (action === "reactivated") return; // could do better here? Seems adequate.

    // session_id consumed by socket.js
    // do something with action ? toaster perhaps

    if (subscription_id !== subscription.attributes.subscription_id) {
      console.log("Subscription id does not match, exiting");
      return; // drop out and do not reload
    };

    if (typeof subscription.attributes.charge_id === "undefined") {
      console.log("Charge id undefined, exiting"); // when user has done cancel/reactivate in one session
      return; // drop out and do not reload
    };

    if (subscription.attributes.charge_id !== charge_id) {
      console.log("Updating charge id", subscription.attributes.charge_id, charge_id);
      if (typeof charge_id !== "undefined") {
        subscription.attributes.charge_id = charge_id;
      };
    } else {
      console.log("Charge id matches");
    };

    // get the message blocks to remove them
    const socketMessages = document.getElementById(messageDivId);
    const saveMessages = document.getElementById(`save-${messageDivId}`);

    if (socketMessages) {
      socketMessages.classList.add("closed"); // uses css transitions
    };

    if (saveMessages) {
      saveMessages.classList.add("closed"); // uses css transitions
    };

    if (timer) {
      const timeTaken = findTimeTaken(timer);
      timer = null;
      this.dispatchEvent(toastEvent({
        notice: `Updates (${action}) completed after ${timeTaken} minutes` ,
        bgColour: "black",
        borderColour: "black"
      }));
    };

    if (socketMessages) {
      // clear the socket messaages
      socketMessages.innerHTML = "";
    } else {
      console.warn("No socketMessages object");
    };

    loading = true;
    if (timer) {
      timer = null;
      await this.refresh();
    };

    await sleepUntil(() => document.getElementById(`subscription-${subscription.attributes.subscription_id}`), 500)
      .then((res) => {
        res.classList.add("disableevents");
      }).catch((e) => {
        // no need for action
      });

    if (action === "cancelled") {
      // in this case we must remove the subscription and load it as a cancelled subscription

      const cancelled = await getCancelledSubscription();
      // then dispatch event to Customer which will shuffle the grouped subscriptions
      const subdiv = document.querySelector(`#subscription-${cancelled.box.id}`);
      setTimeout(() => {
        animateFadeForAction(subdiv, () => {
          this.dispatchEvent(
            new CustomEvent("subscription.cancelled", {
              bubbles: true,
              detail: {
                subscription: cancelled,
                subscription_id: cancelled.box.id,
              },
            })
          );
        });
      }, 100);
      return; // and return out of here

    } else {

      // otherwise reloading the updated charge
      // refetch the charge and adapt to subscription object
      if (editsPending && action !== "deleted" ) {
        const charge = await getSubscription(subscription.attributes.charge_id);
        //console.log(charge);
        editsPending = false;
        if (charge) {
          for (const key of Object.keys(charge)) {
            subscription[key] = charge[key];
          };
        };
      };
      // forces reload of component to make it again editable
      CollapsibleProducts = CollapseWrapper(EditProducts);
      // reset unskippable vale
      unskippable = isUnSkippable();
      // reset ids_orig
      rc_subscription_ids_orig = subscription.attributes.rc_subscription_ids.map(el => { return {...el}; });
      if (collapsed) {
        // restore buttons
        this.dispatchEvent(
          new CustomEvent("customer.enableevents", {
            bubbles: true,
            detail: { subscription_id },
          })
        );
      };
    };
    await sleepUntil(() => document.getElementById(`subscription-${subscription.attributes.subscription_id}`), 500)
      .then((res) => {
        animateFadeForAction(res, () => {
          res.classList.remove("disableevents");
          loading = false;
          this.refresh();
        });
      }).catch((e) => {
        // no need for action
      });

  };


