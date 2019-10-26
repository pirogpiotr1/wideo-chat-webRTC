<?php


namespace App\Http\Controllers;

use Illuminate\Http\Request;



class webRTCController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public $client = null;

    public $auth =[];

    public function __construct()
    {
        $this->middleware('auth');
        $this->auth = [
            'channel_id' => config('constants.CHANNEL_ID'),
            'secret_key' => config('constants.SECRET_KEY')
        ];

        $this->client = \ScaleDrone\Client::create($this->auth);
    }

    public function getCompleteListOfUsersAndRoms()
    {

        return $this->client->members_list();
    }

}
