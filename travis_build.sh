#!/bin/bash

set -e

export SAUCE_ACCESS_KEY=`echo $SAUCE_ACCESS_KEY | rev`

grunt test --browsers SL_Chrome,SL_Safari,SL_Firefox,SL_IE_8,SL_IE_9,SL_IE_10,SL_ANDROID_4,SL_IOS_4,SL_IOS_5,SL_IOS_6 \
  --e2e-browsers SL_Chrome